// Spike for vantage-xex6: native spool hook, mirrors packages/hooks/src/collect.ts.
use std::fs::{create_dir_all, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn run() -> Option<()> {
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input).ok()?;
    let hook: serde_json::Value = serde_json::from_str(&input).ok()?;
    if !hook.is_object() {
        return None;
    }
    let home = match std::env::var_os("VANTAGE_HOME").filter(|v| !v.is_empty()) {
        Some(h) => PathBuf::from(h),
        None => PathBuf::from(std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME"))?).join(".vantage"),
    };
    let dir = home.join("spool");
    create_dir_all(&dir).ok()?;
    let d = SystemTime::now().duration_since(UNIX_EPOCH).ok()?;
    let (secs, ms) = (d.as_secs() as i64, d.subsec_millis());
    let (days, rem) = (secs.div_euclid(86400), secs.rem_euclid(86400));
    // civil-from-days (Howard Hinnant)
    let z = days + 719468;
    let era = z.div_euclid(146097);
    let doe = z.rem_euclid(146097);
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + if month <= 2 { 1 } else { 0 };
    let date = format!("{year:04}-{month:02}-{day:02}");
    let ts = format!("{date}T{:02}:{:02}:{:02}.{ms:03}Z", rem / 3600, rem % 3600 / 60, rem % 60);
    let line = format!("{{\"v\":1,\"receivedAt\":\"{ts}\",\"hook\":{}}}\n", serde_json::to_string(&hook).ok()?);
    let mut f = OpenOptions::new().create(true).append(true).open(dir.join(format!("{date}.jsonl"))).ok()?;
    f.write_all(line.as_bytes()).ok()
}

fn main() {
    let _ = run();
}
