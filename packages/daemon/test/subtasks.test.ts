// Task lists, sub-agent runs and fork and resume counts end to end (D96, D97). All data is synthetic.
import { DatabaseSync } from "node:sqlite";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VantageEvent } from "@vantage/core";
import {
  Store,
  backfillTranscripts,
  itemSessionCounts,
  itemTasks,
  linkStoredEvents,
  loadMigrations,
  undoLink,
} from "../src/index.ts";

const NOW = new Date("2026-10-14T12:00:00Z");
let dir = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-subtasks-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const projects = (): string => join(dir, "projects");
const path = (rel: string): string => join(projects(), "p", rel);
const todo = (sid: string, id: string, ts: string, todos: [string, string][]): string =>
  JSON.stringify({
    type: "assistant",
    sessionId: sid,
    uuid: `u-${id}`,
    timestamp: ts,
    cwd: "/w/unscanned",
    message: {
      content: [
        {
          type: "tool_use",
          id,
          name: "TodoWrite",
          input: { todos: todos.map(([content, status]) => ({ content, status, activeForm: content })) },
        },
        { type: "tool_use", id: `${id}-e`, name: "Edit", input: { file_path: "/w/a.ts" } },
      ],
    },
  });
const write = (rel: string, lines: string[]): void => {
  mkdirSync(join(path(rel), ".."), { recursive: true });
  writeFileSync(path(rel), lines.join("\n") + "\n");
};

const seedList = (): void =>
  write("s-a.jsonl", [
    todo("s-a", "t1", "2026-10-13T09:00:00Z", [
      ["Read the spec", "completed"],
      ["Write the linker rule", "in_progress"],
      ["Update the docs and tell everyone in private", "pending"],
    ]),
    todo("s-a", "t2", "2026-10-13T10:00:00Z", [
      ["Read the spec", "completed"],
      ["Write the linker rule", "completed"],
      ["Update the docs and tell everyone in private", "in_progress"],
    ]),
  ]);

describe("task lists", () => {
  it("an item shows the latest list's counts and the current task", () => {
    seedList();
    backfillTranscripts(store, projects(), NOW);
    linkStoredEvents(store);
    expect(itemTasks(store).get("session:s-a")).toEqual({
      itemKey: "session:s-a",
      tasksTotal: 3,
      tasksDone: 2,
      currentTask: "Update the docs and tell everyone in private",
    });
  });
  it("never stores a todo text beyond the current task, and caps it at 80 characters", () => {
    write("s-b.jsonl", [
      todo("s-b", "t3", "2026-10-13T09:00:00Z", [
        ["Hidden pending item", "pending"],
        ["x ".repeat(100), "in_progress"],
      ]),
    ]);
    backfillTranscripts(store, projects(), NOW);
    const rows = store.db.prepare("SELECT payload_json FROM events WHERE kind = 'task.list.updated'").all();
    expect(rows).toHaveLength(1);
    const payload = JSON.parse(String(rows[0]?.["payload_json"]));
    expect(String(payload.current).length).toBeLessThanOrEqual(80);
    expect(JSON.stringify(payload)).not.toContain("Hidden pending");
  });
  it("with the text switch off the counts stay and the text is not kept", () => {
    store.captureTaskText = false;
    seedList();
    backfillTranscripts(store, projects(), NOW);
    linkStoredEvents(store);
    expect(itemTasks(store).get("session:s-a")).toMatchObject({
      tasksTotal: 3,
      tasksDone: 2,
      currentTask: null,
    });
    const text = store.db
      .prepare("SELECT COUNT(*) AS n FROM events WHERE payload_json LIKE '%linker rule%'")
      .get();
    expect(Number(text?.["n"])).toBe(0);
  });
  it("sums the latest list of each session and follows undo", () => {
    seedList();
    write("s-c.jsonl", [
      todo("s-c", "t9", "2026-10-13T11:00:00Z", [
        ["One", "completed"],
        ["Two", "pending"],
      ]),
    ]);
    backfillTranscripts(store, projects(), NOW);
    linkStoredEvents(store);
    expect(itemTasks(store).get("session:s-c")).toMatchObject({ tasksTotal: 2, tasksDone: 1 });
    const id = Number(
      store.db.prepare("SELECT id FROM events WHERE source_id = 'cc:tool:t9:todos'").get()?.["id"],
    );
    expect(undoLink(store, id, "session:s-c", NOW)).toBe(true);
    expect(itemTasks(store).has("session:s-c")).toBe(false);
  });
  it("a session with no task list has no entry", () => {
    write("s-d.jsonl", [
      JSON.stringify({
        type: "assistant",
        sessionId: "s-d",
        uuid: "u",
        timestamp: "2026-10-13T09:00:00Z",
        message: { content: [{ type: "tool_use", id: "e1", name: "Edit", input: { file_path: "/w/a.ts" } }] },
      }),
    ]);
    backfillTranscripts(store, projects(), NOW);
    linkStoredEvents(store);
    expect(itemTasks(store).size).toBe(0);
  });
});

const agentLine = (t: string, tools: number): string =>
  JSON.stringify({
    type: "assistant",
    sessionId: "s-a",
    agentId: "ag1",
    isSidechain: true,
    uuid: `ag1-${t}`,
    timestamp: `2026-10-13T${t}Z`,
    message: {
      content: Array.from({ length: tools }, (_, i) => ({
        type: "tool_use",
        id: `x${t}${i}`,
        name: "Read",
        input: {},
      })),
    },
  });

describe("sub-agent runs", () => {
  it("sums a run read in two batches, and a replay adds nothing", () => {
    write("s-a.jsonl", [todo("s-a", "t1", "2026-10-13T09:00:00Z", [["One", "pending"]])]);
    write("s-a/subagents/agent-ag1.jsonl", [agentLine("09:01:00", 2)]);
    backfillTranscripts(store, projects(), NOW);
    appendFileSync(path("s-a/subagents/agent-ag1.jsonl"), agentLine("09:05:00", 3) + "\n");
    backfillTranscripts(store, projects(), NOW);
    expect(backfillTranscripts(store, projects(), NOW).inserted).toBe(0);
    linkStoredEvents(store);
    expect(itemSessionCounts(store).get("session:s-a")).toMatchObject({ subagentRuns: 1, subagentTools: 5 });
  });
});

const ev = (
  sourceId: string,
  kind: VantageEvent["kind"],
  sessionId: string,
  t: string,
  payload: Record<string, unknown> = {},
): VantageEvent => ({
  source: "claude_code",
  sourceId,
  kind,
  timestamp: `2026-01-05T${t}Z`,
  sessionId,
  payload,
});

const seedForks = (): void => {
  const at = "2026-01-05T13:00:00Z";
  const put = (e: VantageEvent): void => void store.insertEvent(e, at);
  put(ev("a1", "file.edited", "s-a", "09:00:00", { cwd: "/w/x" }));
  put(ev("a2", "file.edited", "s-a", "11:00:00", { cwd: "/w/x" })); // parent goes on after the forks start
  // s-b: a fork (hook says so), parent still active
  put(ev("d-b", "session.derived", "s-b", "10:00:00", { parentSessionId: "s-a" }));
  put(ev("h-b", "session.started", "s-b", "10:00:00", { start: "fork" }));
  put(ev("b1", "file.edited", "s-b", "10:05:00", { cwd: "/w/x" }));
  // s-c: a resume (hook says so), parent idle since
  put(ev("d-c", "session.derived", "s-c", "12:00:00", { parentSessionId: "s-a" }));
  put(ev("h-c", "session.started", "s-c", "12:00:00", { start: "resume" }));
  put(ev("c1", "file.edited", "s-c", "12:05:00", { cwd: "/w/x" }));
  // s-d: derived, no hook source (history only)
  put(ev("d-d", "session.derived", "s-d", "12:30:00", { parentSessionId: "s-a" }));
  put(ev("d1", "file.edited", "s-d", "12:35:00", { cwd: "/w/x" }));
};

describe("fork and resume counts", () => {
  it("counts forks and resumes from the hook source only, and the fork hint from timing", () => {
    seedForks();
    linkStoredEvents(store);
    expect(itemSessionCounts(store).get("session:s-a")).toMatchObject({
      sessionCount: 4,
      derivedCount: 3,
      forkCount: 1,
      resumeCount: 1,
      forkHintCount: 1,
    });
  });
  it("timing alone never makes a fork: without a hook source forkCount stays 0", () => {
    seedForks();
    store.db.exec("DELETE FROM events WHERE kind = 'session.started'");
    linkStoredEvents(store);
    expect(itemSessionCounts(store).get("session:s-a")).toMatchObject({
      derivedCount: 3,
      forkCount: 0,
      resumeCount: 0,
      forkHintCount: 1,
    });
  });
});

describe("migration 8", () => {
  it("replaces item_sessions and adds item_tasks on a version 6 database, keeping its data", () => {
    const p = join(dir, "old.db");
    const old = new DatabaseSync(p);
    old.exec(`
      CREATE TABLE schema_meta (version INTEGER NOT NULL);
      INSERT INTO schema_meta (version) VALUES (6);
      CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, source_id TEXT NOT NULL,
        kind TEXT NOT NULL, occurred_at TEXT NOT NULL, ingested_at TEXT NOT NULL, session_id TEXT, repo TEXT,
        payload_json TEXT NOT NULL, payload_version INTEGER NOT NULL DEFAULT 1, UNIQUE (source, source_id));
      CREATE TABLE links (event_id INTEGER NOT NULL REFERENCES events (id), item_key TEXT NOT NULL,
        method TEXT NOT NULL, anchor_kind TEXT NOT NULL, anchor_value TEXT NOT NULL, rule TEXT NOT NULL,
        confidence REAL NOT NULL, created_at TEXT NOT NULL, undone_at TEXT, PRIMARY KEY (event_id, item_key));
      CREATE VIEW item_sessions AS SELECT 'x' AS item_key, 1 AS session_count, 0 AS derived_count, 0 AS subagent_count;
      INSERT INTO events (source, source_id, kind, occurred_at, ingested_at, session_id, payload_json)
        VALUES ('claude_code', 'old1', 'file.edited', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z', 's-1', '{}'),
               ('claude_code', 'old2', 'task.list.updated', '2026-01-05T09:01:00Z', '2026-01-05T09:01:00Z', 's-1',
                '{"total":2,"completed":1,"current":"Do it"}');
      INSERT INTO links VALUES (1, 'issue:FTK-9', 'anchor', 'issue_key', 'FTK-9', 'issue-key-branch', 1, '2026-01-05T09:00:00Z', NULL),
                               (2, 'issue:FTK-9', 'anchor', 'issue_key', 'FTK-9', 'issue-key-branch', 1, '2026-01-05T09:01:00Z', NULL);
    `);
    old.close();
    const upgraded = new Store(p);
    try {
      expect(Number(upgraded.db.prepare("SELECT version FROM schema_meta").get()?.["version"])).toBe(
        loadMigrations().length,
      );
      expect(upgraded.countEvents()).toBe(2);
      expect(itemSessionCounts(upgraded).get("issue:FTK-9")).toMatchObject({
        sessionCount: 1,
        forkCount: 0,
        resumeCount: 0,
        subagentRuns: 0,
      });
      expect(itemTasks(upgraded).get("issue:FTK-9")).toEqual({
        itemKey: "issue:FTK-9",
        tasksTotal: 2,
        tasksDone: 1,
        currentTask: "Do it",
      });
    } finally {
      upgraded.close();
    }
  });
});
