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
