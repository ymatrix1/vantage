import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VantageEvent } from "@vantage/core";
import { Store, linkStoredEvents, linksForItem, undoLink } from "../src/index.ts";

let dir = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-link-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const ev = (
  sourceId: string,
  kind: VantageEvent["kind"],
  t: string,
  payload: Record<string, unknown>,
  sessionId = "s1",
): VantageEvent => ({
  sourceId,
  source: "claude_code",
  kind,
  timestamp: `2026-01-05T${t}Z`,
  sessionId,
  payload,
});
const seed = (): void => {
  const at = "2026-01-05T10:00:00Z";
  store.insertEvent(ev("e1", "file.edited", "09:00:00", { branch: "feat/ftk-5-x" }), at);
  store.insertEvent(ev("e2", "prompt.submitted", "09:01:00", {}, "s2"), at);
};
const eventId = (sid: string): number =>
  Number(store.db.prepare("SELECT id FROM events WHERE source_id = ?").get(sid)?.["id"]);

describe("linkStoredEvents", () => {
  it("persists links with method and rule, and reports unlinked events", () => {
    seed();
    const r = linkStoredEvents(store);
    expect(r.unlinked).toHaveLength(1);
    expect(linksForItem(store, "issue:FTK-5")).toMatchObject([
      { eventId: eventId("e1"), rule: "issue-key-branch", anchorKind: "issue_key", undoneAt: null },
    ]);
  });
  it("is idempotent across passes", () => {
    seed();
    linkStoredEvents(store);
    linkStoredEvents(store);
    expect(linksForItem(store, "issue:FTK-5")).toHaveLength(1);
  });
  it("keeps an undone link undone after relinking, and picks up new events", () => {
    seed();
    linkStoredEvents(store);
    expect(undoLink(store, eventId("e1"), "issue:FTK-5")).toBe(true);
    expect(undoLink(store, eventId("e1"), "issue:FTK-5")).toBe(false);
    store.insertEvent(
      ev("e3", "file.edited", "09:05:00", { branch: "feat/ftk-5-x" }),
      "2026-01-05T10:00:00Z",
    );
    linkStoredEvents(store);
    const links = linksForItem(store, "issue:FTK-5");
    expect(links.find((l) => l.eventId === eventId("e1"))?.undoneAt).not.toBeNull();
    expect(links.find((l) => l.eventId === eventId("e3"))?.undoneAt).toBeNull();
  });
});

describe("migration 2", () => {
  it("upgrades a database already at schema version 1 and keeps its events", () => {
    const path = join(dir, "old.db");
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE schema_meta (version INTEGER NOT NULL);
      CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, source_id TEXT NOT NULL,
        kind TEXT NOT NULL, occurred_at TEXT NOT NULL, ingested_at TEXT NOT NULL, session_id TEXT, repo TEXT,
        payload_json TEXT NOT NULL, payload_version INTEGER NOT NULL DEFAULT 1, UNIQUE (source, source_id));
      CREATE INDEX events_session ON events (session_id, occurred_at);
      CREATE TABLE cursors (source TEXT PRIMARY KEY, cursor TEXT NOT NULL, updated_at TEXT NOT NULL);
      INSERT INTO schema_meta (version) VALUES (1);
      INSERT INTO events (source, source_id, kind, occurred_at, ingested_at, payload_json)
        VALUES ('git', 'g1', 'worktree.scanned', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z', '{"worktree":"/w","branch":"feat/ftk-9-x"}');`);
    old.close();
    const upgraded = new Store(path);
    try {
      expect(upgraded.countEvents()).toBe(1);
      expect(Number(upgraded.db.prepare("SELECT version FROM schema_meta").get()?.["version"])).toBe(4);
      linkStoredEvents(upgraded);
      expect(linksForItem(upgraded, "issue:FTK-9")).toHaveLength(1);
    } finally {
      upgraded.close();
    }
  });
});
