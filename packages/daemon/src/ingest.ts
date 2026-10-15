// Spool ingestion and transcript backfill (docs/specs/ingestion.md). Both resume from a byte offset
// stored in `cursors`, and both write through the unique (source, source_id) key, so replays are safe.
import { readdirSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import {
  hookEvents,
  parseSpoolRecord,
  parseTranscriptLine,
  transcriptEvents,
  transcriptLineage,
} from "@vantage/core";
import type { IngestContext, TranscriptLine, VantageEvent } from "@vantage/core";
import type { Store } from "./store.ts";
import { tailLines } from "./tail.ts";
import { captureRequestTitle } from "./titles.ts";

export interface IngestResult {
  files: number;
  inserted: number;
}

/**
 * Worktree roots the git scanner has reported. A shell write is classified against the longest one
 * containing the session cwd (D70). A root the scanner hasn't seen yet falls back to the cwd, and
 * events already stored keep the classification they were ingested with.
 */
export function knownRepoRoots(store: Store): string[] {
  const rows = store.db
    .prepare(
      "SELECT DISTINCT json_extract(payload_json, '$.worktree') AS w FROM events WHERE kind = 'worktree.scanned'",
    )
    .all();
  return rows.flatMap((r) => (typeof r["w"] === "string" && r["w"] !== "" ? [r["w"]] : []));
}

function commit(
  store: Store,
  cursorKey: string,
  offset: number,
  events: VantageEvent[],
  now: string,
): number {
  return store.transaction(() => {
    let inserted = 0;
    for (const e of events) {
      if (store.insertEvent(e, now)) inserted++;
      noteBranch(store, e);
    }
    store.setCursor(cursorKey, offset, now);
    return inserted;
  });
}

const TOOL_KINDS: ReadonlySet<string> = new Set(["file.edited", "command.ran"]);

/** Keeps the transcript's branch for a tool call even when a hook stored the call first (D92). */
function noteBranch(store: Store, e: VantageEvent): void {
  const branch = e.payload["branch"];
  if (e.source === "claude_code" && TOOL_KINDS.has(e.kind) && typeof branch === "string" && branch !== "") {
    store.setEventBranch(e.source, e.sourceId, branch);
  }
}

const BRANCH_BACKFILL = "backfill:event-branches:v1";

/**
 * One pass over the transcripts inside the window that records the branch for tool calls stored before
 * the branch was read (D92). Events are not rewritten; the branch goes beside them and the linker sees
 * it through `loadEvents`. Idempotent: the first value for an event wins, and a marker skips later runs.
 */
export function backfillEventBranches(
  store: Store,
  projectsDir: string,
  now: Date = new Date(),
  days: number = BACKFILL_DAYS,
): { files: number; branches: number } {
  const done = { files: 0, branches: 0 };
  if (store.getCursorText(BRANCH_BACKFILL) !== null) return done;
  const cutoff = now.getTime() - days * 86_400_000;
  const before = store.countEventBranches();
  for (const path of jsonlFiles(projectsDir)) {
    if (statSync(path).mtimeMs < cutoff) continue;
    const parsed: TranscriptLine[] = [];
    for (const l of tailLines(path, 0).lines) {
      const p = parseTranscriptLine(l);
      if (p) parsed.push(p);
    }
    done.files++;
    store.transaction(() => {
      for (const e of transcriptEvents(parsed)) noteBranch(store, e);
    });
  }
  store.setCursorText(BRANCH_BACKFILL, now.toISOString(), now.toISOString());
  done.branches = store.countEventBranches() - before;
  return done;
}

function* jsonlFiles(dir: string): Generator<string> {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const path = join(dir, name);
    const st = statSync(path, { throwIfNoEntry: false });
    if (!st) continue;
    if (st.isDirectory()) yield* jsonlFiles(path);
    else if (name.endsWith(".jsonl")) yield path;
  }
}

export function ingestSpool(store: Store, spoolDir: string, now: Date = new Date()): IngestResult {
  const stamp = now.toISOString();
  const result: IngestResult = { files: 0, inserted: 0 };
  const ctx: IngestContext = { repoRoots: knownRepoRoots(store) };
  for (const path of jsonlFiles(spoolDir)) {
    const key = `spool:${relative(spoolDir, path)}`;
    const { lines, nextOffset } = tailLines(path, store.getCursor(key));
    if (nextOffset === store.getCursor(key) && lines.length === 0) continue;
    const events = lines.flatMap((l) => {
      const rec = parseSpoolRecord(l);
      return rec ? hookEvents(rec, ctx) : [];
    });
    result.files++;
    result.inserted += commit(store, key, nextOffset, events, stamp);
  }
  return result;
}

export const BACKFILL_DAYS = 14;

/** Tails `~/.claude/projects/**\/*.jsonl` files touched in the last `days` days. */
export function backfillTranscripts(
  store: Store,
  projectsDir: string,
  now: Date = new Date(),
  days: number = BACKFILL_DAYS,
  /** Capture first-request titles (default on; `item_titles_from_requests` in config.toml, D95). */
  requestTitles = true,
): IngestResult {
  const stamp = now.toISOString();
  const cutoff = now.getTime() - days * 86_400_000;
  const result: IngestResult = { files: 0, inserted: 0 };
  const ctx: IngestContext = { repoRoots: knownRepoRoots(store) };
  backfillEventBranches(store, projectsDir, now, days);
  for (const path of jsonlFiles(projectsDir)) {
    if (statSync(path).mtimeMs < cutoff) continue;
    const key = `transcript:${relative(projectsDir, path)}`;
    const before = store.getCursor(key);
    // A session file is named by its session id. Sub-agent files (`subagents/`) carry the parent's id
    // and are not sessions of their own. Copied history is read before the window filter (D86).
    const own = path.split(sep).includes("subagents") ? null : basename(path, ".jsonl");
    if (requestTitles && own) captureRequestTitle(store, path, key, own, stamp);
    const { lines, nextOffset } = tailLines(path, before);
    if (lines.length === 0 && nextOffset === before) continue;
    const parsed: TranscriptLine[] = [];
    const all: TranscriptLine[] = [];
    for (const l of lines) {
      const p = parseTranscriptLine(l);
      if (p) all.push(p);
      // Lines older than the window are skipped; a long-lived file may start before the cutoff.
      if (p && p.timestamp && Date.parse(p.timestamp) >= cutoff) parsed.push(p);
    }
    const lineage = own ? transcriptLineage(all, own) : [];
    result.files++;
    result.inserted += commit(store, key, nextOffset, [...lineage, ...transcriptEvents(parsed, ctx)], stamp);
  }
  return result;
}
