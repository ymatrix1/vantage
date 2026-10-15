// Derived sessions end to end: transcript backfill, linking, undo and the per-item counts.
// All data is synthetic.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Store, backfillTranscripts, itemSessionCounts, linkStoredEvents, undoLink } from "../src/index.ts";

const NOW = new Date("2026-10-14T12:00:00Z");
let dir = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-lineage-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const user = (sessionId: string, uuid: string, ts: string): string =>
  JSON.stringify({ type: "user", sessionId, uuid, timestamp: ts, message: { content: "hi" } });
const edit = (sessionId: string, toolId: string, ts: string, extra: object = {}): string =>
  JSON.stringify({
    type: "assistant",
    sessionId,
    uuid: `u-${toolId}`,
    timestamp: ts,
    ...extra,
    message: { content: [{ type: "tool_use", id: toolId, name: "Edit", input: { file_path: "/w/a.ts" } }] },
  });
const write = (rel: string, lines: string[]): void => {
  const path = join(dir, "projects", rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, lines.join("\n") + "\n");
};

/** s-a edits; s-b resumed from s-a (history copied, older than the window); one sub-agent run of s-a. */
const seed = (): void => {
  write("p/s-a.jsonl", [
    user("s-a", "ua1", "2026-10-12T09:00:00Z"),
    edit("s-a", "t1", "2026-10-12T09:01:00Z"),
  ]);
  write("p/s-b.jsonl", [
    user("s-a", "ua0", "2026-08-01T09:00:00Z"), // copied history, outside the 14-day window
    user("s-a", "ua1", "2026-10-12T09:00:00Z"),
    user("s-b", "ub1", "2026-10-13T09:00:00Z"),
    edit("s-b", "t2", "2026-10-13T09:01:00Z"),
  ]);
  write("p/s-a/subagents/agent-ag1.jsonl", [
    edit("s-a", "t3", "2026-10-12T09:05:00Z", { isSidechain: true, agentId: "ag1" }),
  ]);
  write("p/s-c.jsonl", [edit("s-c", "t4", "2026-10-13T10:00:00Z")]); // no signal
  backfillTranscripts(store, join(dir, "projects"), NOW);
};

describe("transcript backfill", () => {
  it("records one session.derived event per derived session, read before the window filter", () => {
    seed();
    const rows = store.db
      .prepare("SELECT session_id, source_id, payload_json FROM events WHERE kind = 'session.derived'")
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ session_id: "s-b", source_id: "cc:lineage:s-b:s-a" });
    expect(JSON.parse(String(rows[0]?.["payload_json"]))).toMatchObject({
      parentSessionId: "s-a",
      lineage: "continuation",
    });
  });
  it("sub-agent files are not sessions: no lineage event, the agent id rides on the event", () => {
    seed();
    const t3 = store.db
      .prepare("SELECT session_id, payload_json FROM events WHERE source_id = 'cc:tool:t3:edit'")
      .get();
    expect(t3?.["session_id"]).toBe("s-a");
    expect(JSON.parse(String(t3?.["payload_json"]))).toMatchObject({ agentId: "ag1" });
  });
  it("a second pass adds nothing (idempotent)", () => {
    seed();
    expect(backfillTranscripts(store, join(dir, "projects"), NOW).inserted).toBe(0);
  });
});

describe("item_sessions counts", () => {
  it("groups the resumed session and the sub-agent under the parent's item", () => {
    seed();
    linkStoredEvents(store);
    const counts = itemSessionCounts(store);
    expect(counts.get("session:s-a")).toEqual({
      itemKey: "session:s-a",
      sessionCount: 2,
      derivedCount: 1,
      subagentCount: 1,
    });
    expect(counts.get("session:s-c")).toMatchObject({ sessionCount: 1, derivedCount: 0, subagentCount: 0 });
    expect(counts.has("session:s-b")).toBe(false);
  });
  it("undoing the child's links removes it from the counts, and later passes keep it out", () => {
    seed();
    linkStoredEvents(store);
    const ids = store.db.prepare("SELECT id FROM events WHERE session_id = 's-b'").all();
    expect(ids).toHaveLength(3); // prompt, edit, lineage marker
    for (const r of ids) expect(undoLink(store, Number(r["id"]), "session:s-a", NOW)).toBe(true);
    linkStoredEvents(store);
    expect(itemSessionCounts(store, "session:s-a").get("session:s-a")).toMatchObject({
      sessionCount: 1,
      derivedCount: 0,
    });
  });
});

describe("migration 4", () => {
  it("adds the item_sessions view to a version 3 database and keeps its data", () => {
    const path = join(dir, "old.db");
    const old = new DatabaseSync(path);
    // The tables the previous release created (the view reads only events and links; work_items is there for the later index migration).
    old.exec(`
      CREATE TABLE schema_meta (version INTEGER NOT NULL);
      INSERT INTO schema_meta (version) VALUES (3);
      CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, source_id TEXT NOT NULL,
        kind TEXT NOT NULL, occurred_at TEXT NOT NULL, ingested_at TEXT NOT NULL, session_id TEXT, repo TEXT,
        payload_json TEXT NOT NULL, payload_version INTEGER NOT NULL DEFAULT 1, UNIQUE (source, source_id));
      CREATE TABLE cursors (source TEXT PRIMARY KEY, cursor TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE links (event_id INTEGER NOT NULL REFERENCES events (id), item_key TEXT NOT NULL,
        method TEXT NOT NULL, anchor_kind TEXT NOT NULL, anchor_value TEXT NOT NULL, rule TEXT NOT NULL,
        confidence REAL NOT NULL, created_at TEXT NOT NULL, undone_at TEXT, PRIMARY KEY (event_id, item_key));
      CREATE TABLE work_items (id INTEGER PRIMARY KEY AUTOINCREMENT, item_key TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
        repo TEXT, stage TEXT NOT NULL, proof_status TEXT NOT NULL, first_activity TEXT NOT NULL, last_activity TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      INSERT INTO events (source, source_id, kind, occurred_at, ingested_at, session_id, payload_json)
        VALUES ('claude_code', 'old1', 'file.edited', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z', 's-1', '{}');
      INSERT INTO links VALUES (1, 'issue:FTK-9', 'anchor', 'issue_key', 'FTK-9', 'issue-key-branch', 1, '2026-01-05T09:00:00Z', NULL);
    `);
    old.close();
    const upgraded = new Store(path);
    try {
      expect(Number(upgraded.db.prepare("SELECT version FROM schema_meta").get()?.["version"])).toBe(7);
      expect(upgraded.countEvents()).toBe(1);
      expect(itemSessionCounts(upgraded).get("issue:FTK-9")).toMatchObject({
        sessionCount: 1,
        derivedCount: 0,
        subagentCount: 0,
      });
    } finally {
      upgraded.close();
    }
  });
});
