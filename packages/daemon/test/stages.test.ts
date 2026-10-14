// Synthetic events only.
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VantageEvent } from "@vantage/core";
import {
  Store,
  createStageLoop,
  dismissFlag,
  getItem,
  linkStoredEvents,
  listItems,
  runStagePass,
  undoLink,
} from "../src/index.ts";

let dir = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-stage-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

let n = 0;
const put = (kind: VantageEvent["kind"], m: number, payload: Record<string, unknown>): number => {
  const e: VantageEvent = {
    sourceId: `d${++n}`,
    source: "claude_code",
    kind,
    timestamp: `2026-01-05T09:${String(m).padStart(2, "0")}:00Z`,
    sessionId: "s1",
    payload: { branch: "feat/ftk-1-demo", ...payload },
  };
  store.insertEvent(e, "2026-01-05T10:00:00Z");
  return Number(store.db.prepare("SELECT id FROM events WHERE source_id = ?").get(e.sourceId)?.["id"]);
};
const edit = (m: number, path = "/w/a.ts"): number => put("file.edited", m, { path });
const cmd = (m: number, command: string, ok = true): number => put("command.ran", m, { command, ok });
const NOW = new Date("2026-01-05T11:00:00Z");

describe("migration 3", () => {
  it("upgrades a version 2 database without touching events or links (now through version 5)", () => {
    const path = join(dir, "old.db");
    const old = new DatabaseSync(path);
    // Exactly the schema the previous release created.
    old.exec(`
      CREATE TABLE schema_meta (version INTEGER NOT NULL);
      INSERT INTO schema_meta (version) VALUES (2);
      CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, source_id TEXT NOT NULL,
        kind TEXT NOT NULL, occurred_at TEXT NOT NULL, ingested_at TEXT NOT NULL, session_id TEXT, repo TEXT,
        payload_json TEXT NOT NULL, payload_version INTEGER NOT NULL DEFAULT 1, UNIQUE (source, source_id));
      CREATE TABLE cursors (source TEXT PRIMARY KEY, cursor TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE links (event_id INTEGER NOT NULL REFERENCES events (id), item_key TEXT NOT NULL,
        method TEXT NOT NULL, anchor_kind TEXT NOT NULL, anchor_value TEXT NOT NULL, rule TEXT NOT NULL,
        confidence REAL NOT NULL, created_at TEXT NOT NULL, undone_at TEXT, PRIMARY KEY (event_id, item_key));
      INSERT INTO events (source, source_id, kind, occurred_at, ingested_at, payload_json)
        VALUES ('claude_code', 'old1', 'file.edited', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z', '{"branch":"feat/ftk-9-x","path":"/w/a.ts"}');
    `);
    old.close();
    const upgraded = new Store(path);
    try {
      const v = upgraded.db.prepare("SELECT version FROM schema_meta").get();
      expect(Number(v?.["version"])).toBe(6);
      expect(upgraded.countEvents()).toBe(1);
      expect(runStagePass(upgraded, {}, NOW).items).toBe(1);
      expect(listItems(upgraded)[0]).toMatchObject({ itemKey: "issue:FTK-9", stage: "built" });
    } finally {
      upgraded.close();
    }
  });
});

describe("runStagePass and the read side", () => {
  it("persists stage, proof and history for a linked item", () => {
    edit(1);
    cmd(2, "pnpm test");
    runStagePass(store, {}, NOW);
    const item = getItem(store, "issue:FTK-1");
    expect(item).toMatchObject({ stage: "proven", proofStatus: "fresh", proofLevel: 1, title: "FTK-1" });
    expect(item?.proofs).toHaveLength(1);
    expect(item?.transitions.map((t) => t.to)).toEqual(["asked", "built", "proven"]);
    expect(item?.transitions.every((t) => t.eventId > 0)).toBe(true);
  });

  it("moves a Proven card back to Built when a later edit lands, keeping the expired proof", () => {
    edit(1);
    cmd(2, "pnpm test");
    runStagePass(store, {}, NOW);
    const later = edit(3);
    runStagePass(store, {}, NOW);
    const item = getItem(store, "issue:FTK-1");
    expect(item?.stage).toBe("built");
    expect(item?.proofs[0]).toMatchObject({ state: "expired", expiredByEventId: later });
    expect(item?.transitions.at(-1)).toMatchObject({ from: "proven", to: "built", eventId: later });
  });

  it("is idempotent: a second pass changes nothing", () => {
    edit(1);
    cmd(2, "pnpm test");
    runStagePass(store, {}, NOW);
    const a = JSON.stringify(getItem(store, "issue:FTK-1"));
    runStagePass(store, {}, NOW);
    expect(JSON.stringify(getItem(store, "issue:FTK-1"))).toBe(a);
    expect(Number(store.db.prepare("SELECT COUNT(*) AS n FROM work_items").get()?.["n"])).toBe(1);
  });

  it("an undone link takes its event out of the item on the next pass", () => {
    edit(1);
    const test = cmd(2, "pnpm test");
    runStagePass(store, {}, NOW);
    expect(undoLink(store, test, "issue:FTK-1")).toBe(true);
    runStagePass(store, {}, NOW);
    expect(getItem(store, "issue:FTK-1")?.stage).toBe("built");
  });

  it("drops an item whose links are all undone", () => {
    const e = edit(1);
    runStagePass(store, {}, NOW);
    undoLink(store, e, "issue:FTK-1");
    runStagePass(store, {}, NOW);
    expect(listItems(store)).toEqual([]);
  });

  it("unlinked events create no item", () => {
    put("file.edited", 1, { branch: "main", path: "/w/a.ts" });
    store.db.exec("UPDATE events SET session_id = NULL");
    runStagePass(store, {}, NOW);
    expect(listItems(store)).toEqual([]);
  });

  it("raises and clears flags; a dismissed flag stays dismissed while it stays raised", () => {
    edit(1);
    put("session.stopped", 2, {});
    runStagePass(store, {}, NOW);
    expect(getItem(store, "issue:FTK-1")?.flags.map((f) => f.kind)).toEqual(["unproven_claim"]);
    expect(dismissFlag(store, "issue:FTK-1", "unproven_claim")).toBe(true);
    runStagePass(store, {}, NOW);
    expect(getItem(store, "issue:FTK-1")?.flags).toEqual([]);
    cmd(3, "pnpm test");
    runStagePass(store, {}, NOW);
    const cleared = store.db.prepare("SELECT cleared_at FROM flags").get();
    expect(cleared?.["cleared_at"]).not.toBeNull();
  });

  it("lists items most recently active first", () => {
    edit(1);
    put("file.edited", 5, { branch: "feat/ftk-2-other", path: "/w/b.ts" });
    runStagePass(store, {}, NOW);
    expect(listItems(store).map((i) => i.itemKey)).toEqual(["issue:FTK-2", "issue:FTK-1"]);
  });

  it("returns null for an unknown item", () => {
    expect(getItem(store, "issue:NOPE-1")).toBeNull();
  });
});

describe("scheduled pass", () => {
  it("tick runs a pass and a failing pass is reported, not thrown", () => {
    edit(1);
    const loop = createStageLoop({ store, now: () => NOW });
    expect(loop.tick().items).toBe(1);
    const errors: unknown[] = [];
    const broken = createStageLoop({
      store,
      now: () => {
        throw new Error("boom");
      },
      intervalMs: 5,
      onError: (e) => errors.push(e),
    });
    broken.start();
    broken.stop();
    expect(errors).toHaveLength(1);
  });

  it("links are written by the same pass", () => {
    edit(1);
    runStagePass(store, {}, NOW);
    expect(linkStoredEvents(store, {}, NOW).links).toHaveLength(1);
  });
});
