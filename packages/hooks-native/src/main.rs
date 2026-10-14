// Native spool hook (D72). Mirrors packages/hooks/src/collect.ts: read one JSON object from stdin,
// append `{"v":1,"receivedAt":<ISO>,"hook":<object>}` as one line to `$VANTAGE_HOME/spool/<day>.jsonl`,
// and exit 0 on any error so a broken spool never breaks or slows the agent.
//
// Stop (D76): the one synchronous hook also runs the proof gate, which is Node code. When argv[1] names
// the Node entry (`dist/src/bin.js`), a Stop payload is handed to `node <entry>` untouched, so the gate
// and its spool line stay in one place. Without it (or if node can't start) Stop is spooled natively
// and the gate is skipped, which fails open.
use std::fs::{create_dir_all, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

/// Days since 1970-01-01 to (year, month, day); Howard Hinnant's civil-from-days.
fn civil(days: i64) -> (i64, i64, i64) {
    let z = days + 719468;
    let era = z.div_euclid(146097);
    let doe = z.rem_euclid(146097);
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    (yoe + era * 400 + if month <= 2 { 1 } else { 0 }, month, day)
}

/// `(YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS.mmmZ)`, the same strings as `toISOString()`.
fn stamp(unix_ms: i64) -> (String, String) {
    let secs = unix_ms.div_euclid(1000);
    let ms = unix_ms.rem_euclid(1000);
    let (y, m, d) = civil(secs.div_euclid(86400));
    let rem = secs.rem_euclid(86400);
    let date = format!("{y:04}-{m:02}-{d:02}");
    let iso = format!("{date}T{:02}:{:02}:{:02}.{ms:03}Z", rem / 3600, rem % 3600 / 60, rem % 60);
    (date, iso)
}

fn spool_dir() -> Option<PathBuf> {
    let home = match std::env::var_os("VANTAGE_HOME").filter(|v| !v.is_empty()) {
        Some(h) => PathBuf::from(h),
        None => {
            let user = if cfg!(windows) { "USERPROFILE" } else { "HOME" };
            PathBuf::from(std::env::var_os(user).filter(|v| !v.is_empty())?).join(".vantage")
        }
    };
    Some(home.join("spool"))
}

fn is_stop(hook: &serde_json::Value) -> bool {
    hook.get("hook_event_name").and_then(|v| v.as_str()) == Some("Stop")
}

/// Runs the Node entry with the original stdin and passes its stdout through. False if it never ran.
fn hand_off(entry: &str, input: &str) -> bool {
    if !std::path::Path::new(entry).is_file() {
        return false;
    }
    let Ok(mut child) = Command::new("node").arg(entry).stdin(Stdio::piped()).spawn() else {
        return false;
    };
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(input.as_bytes());
    }
    child.wait().is_ok()
}

fn run() -> Option<()> {
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input).ok()?;
    let hook: serde_json::Value = serde_json::from_str(&input).ok()?;
    if !hook.is_object() {
        return None;
    }
    if is_stop(&hook) {
        if let Some(entry) = std::env::args().nth(1) {
            if hand_off(&entry, &input) {
                return Some(());
            }
        }
    }
    let dir = spool_dir()?;
    create_dir_all(&dir).ok()?;
    let ms = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_millis() as i64;
    let (date, iso) = stamp(ms);
    let line = format!("{{\"v\":1,\"receivedAt\":\"{iso}\",\"hook\":{}}}\n", serde_json::to_string(&hook).ok()?);
    // One write on an O_APPEND handle, so concurrent hooks don't interleave lines.
    let mut f = OpenOptions::new().create(true).append(true).open(dir.join(format!("{date}.jsonl"))).ok()?;
    f.write_all(line.as_bytes()).ok()
}

fn main() {
    let _ = run();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stamp_matches_to_iso_string() {
        assert_eq!(stamp(0).1, "1970-01-01T00:00:00.000Z");
        assert_eq!(stamp(1_791_626_400_123).1, "2026-10-10T10:00:00.123Z");
        assert_eq!(stamp(951_782_400_000).0, "2000-02-29");
        assert_eq!(stamp(-1).1, "1969-12-31T23:59:59.999Z");
    }

    #[test]
    fn key_order_is_preserved() {
        let v: serde_json::Value = serde_json::from_str(r#"{"z":1,"a":{"y":2,"b":3}}"#).unwrap();
        assert_eq!(serde_json::to_string(&v).unwrap(), r#"{"z":1,"a":{"y":2,"b":3}}"#);
    }
}
