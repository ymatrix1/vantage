// Request titles (proposed D95): the first sentence of a session's first request, cleaned by
// `requestTitle` in core, kept in `session_titles` and used only as the title of that session's
// provisional item. Local only; nothing here logs, sends or re-exposes the text.
import { closeSync, openSync, readSync } from "node:fs";
import { firstRequestTitle, latestSessionName, parseTranscriptLine } from "@vantage/core";
import type { Store } from "./store.ts";

/** The first request sits near the top of a transcript; never read more than this per file. */
const HEAD_BYTES = 256 * 1024;

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
export function captureRequestTitle(store: Store, path: string, key: string, own: string, now: string): void {
  const marker = `titles:${key}`;
  if (store.getCursor(marker) !== 0) return;
  const parsed = headLines(path).flatMap((l) => {
    const p = parseTranscriptLine(l);
    return p ? [p] : [];
  });
  const first = firstRequestTitle(parsed, own);
  if (!first.found) return;
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

/** session id to title, read once per stage pass. */
export function requestTitleMap(store: Store): Map<string, string> {
  return new Map(listRequestTitles(store).map((t) => [t.sessionId, t.title]));
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
  const found = latestSessionName(lines, own);
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
