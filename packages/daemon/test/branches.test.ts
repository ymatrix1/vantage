// Branch on tool events end to end: transcript backfill, events stored before the branch was read,
// the one-shot backfill, and migration 6. All data is synthetic (D92).
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VantageEvent } from "@vantage/core";
import {
  Store,
  backfillEventBranches,
  backfillTranscripts,
  linkStoredEvents,
  linksForItem,
} from "../src/index.ts";

const NOW = new Date("2026-10-14T12:00:00Z");
let dir = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-branch-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const projects = (): string => join(dir, "projects");
const edit = (sid: string, toolId: string, ts: string, branch?: string): string =>
  JSON.stringify({
    type: "assistant",
    sessionId: sid,
    uuid: `u-${toolId}`,
    timestamp: ts,
    cwd: "/w/unscanned",
    ...(branch ? { gitBranch: branch } : {}),
    message: { content: [{ type: "tool_use", id: toolId, name: "Edit", input: { file_path: "/w/a.ts" } }] },
  });
const writeTranscript = (name: string, lines: string[]): string => {
  const path = join(projects(), "p", name);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, lines.join("\n") + "\n");
  return path;
};
/** A tool call stored before the branch was read: no branch in the payload. */
const stored = (toolId: string, sid: string, ts: string): VantageEvent => ({
  source: "claude_code",
  sourceId: `cc:tool:${toolId}:edit`,
  kind: "file.edited",
  timestamp: ts,
  sessionId: sid,
  payload: { tool: "Edit", toolUseId: toolId, cwd: "/w/unscanned", via: "edit-tool" },
});
const itemKeys = (): string[] =>
  store.db
    .prepare("SELECT DISTINCT item_key FROM links WHERE undone_at IS NULL ORDER BY item_key")
    .all()
    .map((r) => String(r["item_key"]));

describe("events stored before the branch was read", () => {
  it("stay session items until the backfill records their branch beside them", () => {
    store.insertEvent(stored("t1", "s-1", "2026-10-13T09:00:00Z"), NOW.toISOString());
    const file = writeTranscript("s-1.jsonl", [edit("s-1", "t1", "2026-10-13T09:00:00Z", "claude/calm-owl")]);
    store.setCursor("transcript:p/s-1.jsonl", statSync(file).size, NOW.toISOString()); // already tailed
    linkStoredEvents(store);
    expect(itemKeys()).toEqual(["session:s-1"]);

    const r = backfillEventBranches(store, projects(), NOW);
    expect(r).toEqual({ files: 1, branches: 1 });
    linkStoredEvents(store);
    expect(itemKeys()).toEqual(["branch::claude/calm-owl"]);
    expect(linksForItem(store, "branch::claude/calm-owl")).toMatchObject([{ rule: "branch" }]);
    // The stored event itself is untouched.
    const row = store.db.prepare("SELECT payload_json FROM events WHERE source_id = 'cc:tool:t1:edit'").get();
    expect(JSON.parse(String(row?.["payload_json"]))).not.toHaveProperty("branch");
  });

  it("is idempotent: a second run adds nothing and keeps the first branch", () => {
    store.insertEvent(stored("t1", "s-1", "2026-10-13T09:00:00Z"), NOW.toISOString());
    writeTranscript("s-1.jsonl", [edit("s-1", "t1", "2026-10-13T09:00:00Z", "feat/ftk-9-x")]);
    expect(backfillEventBranches(store, projects(), NOW).branches).toBe(1);
    expect(backfillEventBranches(store, projects(), NOW)).toEqual({ files: 0, branches: 0 }); // marker
    store.setEventBranch("claude_code", "cc:tool:t1:edit", "feat/other"); // a later value does not replace it
    expect(store.countEventBranches()).toBe(1);
    linkStoredEvents(store);
    expect(itemKeys()).toEqual(["issue:FTK-9"]);
  });

  it("a hook stored the call first: the transcript pass still records the branch", () => {
    store.insertEvent(stored("t2", "s-2", "2026-10-13T09:00:00Z"), NOW.toISOString());
    writeTranscript("s-2.jsonl", [edit("s-2", "t2", "2026-10-13T09:00:00Z", "feat/ftk-3-y")]);
    expect(backfillTranscripts(store, projects(), NOW).inserted).toBe(0); // deduped on the tool id
    linkStoredEvents(store);
    expect(itemKeys()).toEqual(["issue:FTK-3"]);
  });

  it("no gitBranch, default branch and detached lines record nothing and keep today's behaviour", () => {
    writeTranscript("s-3.jsonl", [edit("s-3", "t3", "2026-10-13T09:00:00Z")]);
    writeTranscript("s-4.jsonl", [edit("s-4", "t4", "2026-10-13T09:00:00Z", "HEAD")]);
    backfillTranscripts(store, projects(), NOW);
    expect(store.countEventBranches()).toBe(0);
    linkStoredEvents(store);
    expect(itemKeys()).toEqual(["session:s-3", "session:s-4"]);
  });

  it("a new transcript edit carries the branch in its payload and the item follows it", () => {
    writeTranscript("s-5.jsonl", [
      edit("s-5", "t5", "2026-10-13T09:00:00Z", "feat/one"),
      edit("s-5", "t6", "2026-10-13T10:00:00Z", "feat/two"),
    ]);
    backfillTranscripts(store, projects(), NOW);
    linkStoredEvents(store);
    expect(itemKeys()).toEqual(["branch::feat/one", "branch::feat/two"]);
  });
});

describe("migration 5", () => {
  it("adds event_branches to a version 5 database and keeps its data", () => {
    const path = join(dir, "old.db");
    const old = new DatabaseSync(path);
    old.exec(`
      CREATE TABLE schema_meta (version INTEGER NOT NULL);
      INSERT INTO schema_meta (version) VALUES (5);
      CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, source_id TEXT NOT NULL,
        kind TEXT NOT NULL, occurred_at TEXT NOT NULL, ingested_at TEXT NOT NULL, session_id TEXT, repo TEXT,
        payload_json TEXT NOT NULL, payload_version INTEGER NOT NULL DEFAULT 1, UNIQUE (source, source_id));
      CREATE TABLE cursors (source TEXT PRIMARY KEY, cursor TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE links (event_id INTEGER NOT NULL REFERENCES events (id), item_key TEXT NOT NULL,
        method TEXT NOT NULL, anchor_kind TEXT NOT NULL, anchor_value TEXT NOT NULL, rule TEXT NOT NULL,
        confidence REAL NOT NULL, created_at TEXT NOT NULL, undone_at TEXT, PRIMARY KEY (event_id, item_key));
      CREATE TABLE work_items (id INTEGER PRIMARY KEY AUTOINCREMENT, item_key TEXT NOT NULL UNIQUE, title TEXT NOT NULL);
      INSERT INTO events (source, source_id, kind, occurred_at, ingested_at, session_id, payload_json)
        VALUES ('claude_code', 'cc:tool:old:edit', 'file.edited', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z', 's-1', '{}');
    `);
    old.close();
    const upgraded = new Store(path);
    try {
      expect(Number(upgraded.db.prepare("SELECT version FROM schema_meta").get()?.["version"])).toBe(7);
      expect(upgraded.countEvents()).toBe(1);
      expect(upgraded.countEventBranches()).toBe(0);
      upgraded.setEventBranch("claude_code", "cc:tool:old:edit", "feat/ftk-2-x");
      linkStoredEvents(upgraded);
      expect(linksForItem(upgraded, "issue:FTK-2")).toHaveLength(1);
    } finally {
      upgraded.close();
    }
  });
});
