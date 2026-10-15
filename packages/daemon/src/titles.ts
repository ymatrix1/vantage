// Request titles (proposed D95): the first sentence of a session's first request, cleaned by
// `requestTitle` in core, kept in `session_titles` and used only as the title of that session's
// provisional item. Local only; nothing here logs, sends or re-exposes the text.
import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { firstRequestTitle, latestSessionName, looksInjectedTitle, parseTranscriptLine } from "@vantage/core";
import type { Store } from "./store.ts";

/** The first request sits near the top of a transcript; never read more than this per file. */
const HEAD_BYTES = 256 * 1024;

/**
 * A transcript can open with megabytes of attachments before the first thing the person typed (measured on real
 * data: the first request sat 0.6 to 3.9 MB in). When the first look finds none, one deeper read goes this far.
 */
const DEEP_BYTES = 6 * 1024 * 1024;
/** Where a session's name is looked for the first time: the file's start and its last megabytes (names are re-written every turn). */
const NAME_HEAD_BYTES = 1024 * 1024;
const NAME_TAIL_BYTES = 2 * 1024 * 1024;

/**
 * How many one-time deep reads (names, deeper requests) one backfill pass may do. Measured on a copy of a real
 * store (about 500 transcripts): all of them in one pass took 9 s on the daemon's only thread, so they are spread
 * over passes; a file that has to wait keeps its marker unset and is picked up by a later pass.
 */
export const DEEP_READS_PER_PASS = 60;
export interface DeepBudget {
  left: number;
}

/** Complete lines from the last `maxBytes` of a file (the first, probably partial, line is dropped). */
export function tailWindowLines(path: string, maxBytes: number): string[] {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - maxBytes);
    const buf = Buffer.alloc(size - start);
    let read = 0;
    while (read < buf.length) {
      const n = readSync(fd, buf, read, buf.length - read, start + read);
      if (n === 0) break;
      read += n;
    }
    const lines = buf.subarray(0, read).toString("utf8").split("\n");
    // The last line may be unfinished; the first is partial unless the window starts at the file's start.
    return lines.slice(start > 0 ? 1 : 0, -1).filter((l) => l.trim() !== "");
  } finally {
    closeSync(fd);
  }
}

/** Complete lines from the start of a file, at most HEAD_BYTES of them. */
export function headLines(path: string, maxBytes: number = HEAD_BYTES): string[] {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(maxBytes);
    let read = 0;
    while (read < maxBytes) {
      const n = readSync(fd, buf, read, maxBytes - read, read);
      if (n === 0) break;
      read += n;
    }
    const end = buf.subarray(0, read).lastIndexOf(0x0a);
    if (end < 0) return [];
    return buf
      .subarray(0, end)
      .toString("utf8")
      .split("\n")
      .filter((l) => l.trim() !== "");
  } finally {
    closeSync(fd);
  }
}

/**
 * Captures the title of session `own` from the head of its transcript, once per file. The marker
 * cursor `titles:<key>` is set when a first request was found (even if it left nothing usable), so
 * the file is not read again; a file with no user request yet is retried on the next pass.
 * Re-running is idempotent: the session id is the key and an existing title is kept.
 */
export function captureRequestTitle(
  store: Store,
  path: string,
  key: string,
  own: string,
  now: string,
  budget?: DeepBudget,
): void {
  // `titles2:` replaced `titles:` when injected text stopped counting as a request (D194): every head is read once more.
  const marker = `titles2:${key}`;
  if (store.getCursor(marker) !== 0) return;
  const read = (bytes: number) =>
    headLines(path, bytes).flatMap((l) => {
      const p = parseTranscriptLine(l);
      return p ? [p] : [];
    });
  let first = firstRequestTitle(read(HEAD_BYTES), own);
  if (!first.found) {
    // Nothing typed yet in the first look: look once more, deeper, and never again (a session with no request
    // at all would otherwise be re-read on every pass).
    const deep = `titles-deep:${key}`;
    if (store.getCursor(deep) !== 0) return;
    if (budget) {
      if (budget.left <= 0) return;
      budget.left--;
    }
    first = firstRequestTitle(read(DEEP_BYTES), own);
    store.setCursor(deep, 1, now);
    if (!first.found) return;
  }
  store.transaction(() => {
    if (first.title !== null) {
      store.db
        .prepare("INSERT OR IGNORE INTO session_titles (session_id, title, captured_at) VALUES (?, ?, ?)")
        .run(own, first.title, now);
    }
    store.setCursor(marker, 1, now);
  });
}

export interface StoredRequestTitle {
  sessionId: string;
  title: string;
  capturedAt: string;
}

/** What is stored, newest first. For `vantage titles`. */
export function listRequestTitles(store: Store): StoredRequestTitle[] {
  return store.db
    .prepare(
      "SELECT session_id, title, captured_at FROM session_titles ORDER BY captured_at DESC, session_id",
    )
    .all()
    .map((r) => ({
      sessionId: String(r["session_id"]),
      title: String(r["title"]),
      capturedAt: String(r["captured_at"]),
    }));
}

/** session id to title, read once per stage pass. A title that is really injected text is never used (D194). */
export function requestTitleMap(store: Store): Map<string, string> {
  return new Map(
    listRequestTitles(store)
      .filter((t) => !looksInjectedTitle(t.title))
      .map((t) => [t.sessionId, t.title]),
  );
}

/** Deletes stored titles that are injected text (captured before D194), once; returns how many. */
export function repairRequestTitles(store: Store, now: string): number {
  const marker = "titles-repair:d194";
  if (store.getCursor(marker) !== 0) return 0;
  return store.transaction(() => {
    let n = 0;
    for (const t of listRequestTitles(store)) {
      if (!looksInjectedTitle(t.title)) continue;
      store.db.prepare("DELETE FROM session_titles WHERE session_id = ?").run(t.sessionId);
      n++;
    }
    store.setCursor(marker, 1, now);
    return n;
  });
}

/**
 * Deletes every stored title and returns how many. The capture markers stay, so a cleared title is
 * not captured again; turn the setting off to stop capturing, or reset the markers by deleting the
 * `titles:` cursors. Item titles fall back on the next stage pass.
 */
export function clearRequestTitles(store: Store): number {
  return store.transaction(() => Number(store.db.prepare("DELETE FROM session_titles").run().changes));
}

/**
 * Keeps the name Claude Code gave session `own` from newly read transcript lines (D191). A custom name is
 * never replaced by a generated one; otherwise the latest name wins. Idempotent.
 */
export function captureSessionName(store: Store, lines: readonly string[], own: string, now: string): void {
  upsertSessionName(store, latestSessionName(lines, own), own, now);
}

/**
 * A transcript already read before names were captured has its cursor past every name line, so the first time a
 * file is seen its start and its last megabytes are searched once (a name is re-written on every turn, so the
 * newest sits near the end). Later names arrive with the new lines.
 */
export function captureSessionNameFromFile(
  store: Store,
  path: string,
  key: string,
  own: string,
  now: string,
  budget?: DeepBudget,
): void {
  const marker = `names1:${key}`;
  if (store.getCursor(marker) !== 0) return;
  if (budget) {
    if (budget.left <= 0) return;
    budget.left--;
  }
  const lines = [...headLines(path, NAME_HEAD_BYTES), ...tailWindowLines(path, NAME_TAIL_BYTES)];
  store.transaction(() => {
    upsertSessionName(store, latestSessionName(lines, own), own, now);
    store.setCursor(marker, 1, now);
  });
}

function upsertSessionName(
  store: Store,
  found: ReturnType<typeof latestSessionName>,
  own: string,
  now: string,
): void {
  if (!found) return;
  const { name, source } = found;
  store.db
    .prepare(
      `INSERT INTO session_names (session_id, name, source, captured_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (session_id) DO UPDATE SET name = excluded.name, source = excluded.source, captured_at = excluded.captured_at
       WHERE excluded.source = 'custom' OR session_names.source = 'agent'`,
    )
    .run(own, name, source, now);
}

/** session id to its Claude Code name, read once per stage pass. */
export function sessionNameMap(store: Store): Map<string, string> {
  return new Map(
    store.db
      .prepare("SELECT session_id, name FROM session_names")
      .all()
      .map((r) => [String(r["session_id"]), String(r["name"])]),
  );
}

/** Deletes every stored session name and returns how many; the next transcript pass reads them again only for new lines. */
export function clearSessionNames(store: Store): number {
  return store.transaction(() => Number(store.db.prepare("DELETE FROM session_names").run().changes));
}
