// Synthetic data only. Pure view logic for the live push path (D81); no DOM, no network.
import { describe, expect, it } from "vitest";
import type { TrackRow, TrackView } from "../src/lib/contract";
import {
  BACKOFF_MAX_MS,
  BACKOFF_START_MS,
  applyPush,
  mergeCounts,
  nextBackoff,
  parsePush,
  type LivePush,
} from "../src/lib/live";
import { group, item, track } from "./helpers";

const row = (id: string, over: Partial<TrackRow> = {}): TrackRow => item({ id, title: id, ...over });
const view = (items: TrackRow[]): TrackView => ({
  ...track(items),
  generatedAt: "2026-01-05T10:00:00Z",
  lastPassAt: "2026-01-05T10:00:00Z",
});
const env = { at: "2026-01-05T10:00:01Z", lastPassAt: "2026-01-05T10:00:01Z" };
const ids = (v: TrackView): string[] => v.groups.flatMap((g) => g.items.map((i) => i.id));

describe("applyPush (the page the user is on never changes under them)", () => {
  it("merges changed fields into a visible row in place and asks for fresh counts", () => {
    const flag = { kind: "unproven_claim", severity: "red", reason: "claimed done, no proof" };
    const push: LivePush = {
      ...env,
      type: "item.changed",
      id: "b",
      isNew: false,
      fields: { flags: [flag], title: "B2" },
    };
    const { view: next, refresh } = applyPush(view([row("a"), row("b"), row("c")]), push);
    expect(ids(next)).toEqual(["a", "b", "c"]);
    expect(next.groups[0]?.items[1]?.title).toBe("B2");
    expect(next.groups[0]?.items[1]?.flags).toEqual([flag]);
    expect(refresh).toBe("facets");
  });

  it("does not add, move or remove rows for items outside the page, new or not", () => {
    const start = view([row("a")]);
    const unseen: LivePush = {
      ...env,
      type: "item.changed",
      id: "x",
      isNew: false,
      fields: { stage: "built" },
    };
    const fresh: LivePush = {
      ...env,
      type: "item.changed",
      id: "n",
      isNew: true,
      fields: { title: "N", stage: "asked", flags: [] },
    };
    for (const push of [unseen, fresh]) {
      const { view: next, refresh } = applyPush(start, push);
      expect(ids(next)).toEqual(["a"]);
      expect(next.page).toEqual(start.page);
      expect(refresh).toBe("facets");
    }
  });

  it("does not regroup a visible row whose flag changed", () => {
    const start: TrackView = {
      ...view([]),
      groups: [group("needs_you", "Needs you", [row("a")]), group("in_progress", "In progress", [row("b")])],
    };
    const push: LivePush = { ...env, type: "item.changed", id: "b", isNew: false, fields: { flags: [] } };
    const { view: next } = applyPush(start, push);
    expect(next.groups.map((g) => g.items.map((i) => i.id))).toEqual([["a"], ["b"]]);
  });

  it("refetches on resync, replaces sources, and clears stale from the pass time", () => {
    expect(applyPush(view([]), { ...env, type: "resync" }).refresh).toBe("full");
    const src = [{ source: "git", state: "ok" as const, events: 1, lastEventAt: null }];
    const { view: next, refresh } = applyPush(
      { ...view([]), stale: true },
      { ...env, type: "source.health", sources: src },
    );
    expect(next.sources).toEqual(src);
    expect(next.stale).toBe(false);
    expect(refresh).toBe("none");
  });
});

describe("mergeCounts", () => {
  it("takes facets and totals from a fresh response and keeps the rows shown", () => {
    const shown = view([row("a")]);
    const fresh: TrackView = {
      ...view([row("z")]),
      page: { page: 1, pageSize: 25, total: 40, pages: 2 },
      groups: [group("in_progress", "In progress", [row("z")], 40)],
      facets: { ...track([]).facets, repo: { r: 9 } },
    };
    const next = mergeCounts(shown, fresh);
    expect(ids(next)).toEqual(["a"]);
    expect(next.page).toMatchObject({ page: 1, total: 40, pages: 2 });
    expect(next.groups[0]?.total).toBe(40);
    expect(next.facets.repo).toEqual({ r: 9 });
  });
});

describe("parsePush", () => {
  it("accepts known pushes and ignores everything else", () => {
    expect(parsePush(JSON.stringify({ ...env, type: "resync" }))?.type).toBe("resync");
    expect(parsePush("not json")).toBeNull();
    expect(parsePush(JSON.stringify({ ...env, type: "rm -rf" }))).toBeNull();
    expect(parsePush(JSON.stringify({ type: "resync" }))).toBeNull();
    expect(parsePush(JSON.stringify({ ...env, type: "item.changed", id: 1, fields: {} }))).toBeNull();
  });
});

describe("reconnect backoff", () => {
  it("doubles from 1 s to a 30 s cap", () => {
    const seq = [BACKOFF_START_MS];
    for (let i = 0; i < 6; i++) seq.push(nextBackoff(seq[i] ?? 0));
    expect(seq).toEqual([1000, 2000, 4000, 8000, 16000, BACKOFF_MAX_MS, BACKOFF_MAX_MS]);
  });
});
