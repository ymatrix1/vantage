// Synthetic data only. Pure view logic for the live push path (D81); no DOM, no network.
import { describe, expect, it } from "vitest";
import { ATTENTION_LABEL, ATTENTION_ORDER, type TrackResponse } from "@vantage/core/track";
import {
  BACKOFF_MAX_MS,
  BACKOFF_START_MS,
  applyPush,
  nextBackoff,
  parsePush,
  type LivePush,
} from "../src/lib/live.ts";

const item = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: id,
  repo: "r",
  stage: "built",
  proofStatus: "none",
  proofLevel: 0,
  docsOnly: false,
  flags: [] as { kind: string; severity: string; reason: string }[],
  lastActivity: "2026-01-05T09:00:00Z",
  ...over,
});
const view = (items: ReturnType<typeof item>[]): TrackResponse => ({
  generatedAt: "2026-01-05T10:00:00Z",
  lastPassAt: "2026-01-05T10:00:00Z",
  stale: false,
  groups: ATTENTION_ORDER.map((attention) => ({
    attention,
    label: ATTENTION_LABEL[attention],
    items: attention === "in_progress" ? items : [],
  })),
  sources: [],
});
const env = { at: "2026-01-05T10:00:01Z", lastPassAt: "2026-01-05T10:00:01Z" };
const ids = (v: TrackResponse, a: string): string[] =>
  v.groups.find((g) => g.attention === a)?.items.map((i) => i.id) ?? [];

describe("applyPush", () => {
  it("merges changed fields and moves an item into Needs you when a flag appears", () => {
    const flag = { kind: "claimed_without_proof", severity: "red", reason: "r" };
    const push: LivePush = { ...env, type: "item.changed", id: "a", isNew: false, fields: { flags: [flag] } };
    const next = applyPush(view([item("a"), item("b")]), push);
    expect(ids(next!, "needs_you")).toEqual(["a"]);
    expect(ids(next!, "in_progress")).toEqual(["b"]);
    expect(next?.groups.flatMap((g) => g.items).find((i) => i.id === "a")?.title).toBe("a");
  });

  it("adds a new item and refetches when a push is not enough to build one", () => {
    const full: LivePush = {
      ...env,
      type: "item.changed",
      id: "n",
      isNew: true,
      fields: { title: "N", stage: "asked", flags: [] },
    };
    expect(ids(applyPush(view([item("a")]), full)!, "in_progress")).toEqual(["a", "n"]);
    const partial: LivePush = {
      ...env,
      type: "item.changed",
      id: "n",
      isNew: true,
      fields: { stage: "asked" },
    };
    expect(applyPush(view([item("a")]), partial)).toBeNull();
    const unseen: LivePush = {
      ...env,
      type: "item.changed",
      id: "x",
      isNew: false,
      fields: { stage: "built" },
    };
    expect(applyPush(view([item("a")]), unseen)).toBeNull();
  });

  it("refetches on resync, replaces sources, and clears stale from the pass time", () => {
    expect(applyPush(view([]), { ...env, type: "resync" })).toBeNull();
    const src = [{ source: "git", state: "ok" as const, events: 1, lastEventAt: null }];
    const stale = { ...view([]), stale: true };
    const next = applyPush(stale, { ...env, type: "source.health", sources: src });
    expect(next?.sources).toEqual(src);
    expect(next?.stale).toBe(false);
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
