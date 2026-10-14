// Synthetic data only. How the page folds quiet rows into its own groups.
import { describe, expect, it } from "vitest";
import { foldGroups } from "../src/lib/fold";
import { DEFAULT_VIEW } from "../src/lib/view";
import { emptyFacets, group, item, track } from "./helpers";

const NOW = new Date("2026-10-14T12:00:00Z");
const old = "2026-09-20T00:00:00Z";
const data = track([], {
  facets: { ...emptyFacets(), hasEdits: { true: 5, false: 9 } },
  groups: [
    group(
      "needs_you",
      "Needs you",
      [item({ id: "a", hasEdits: false }), item({ id: "b", lastActivity: old })],
      4,
    ),
    group("in_progress", "In progress", [item({ id: "c" })], 6),
  ],
});
const ids = (g: { items: { id: string }[] }): string[] => g.items.map((i) => i.id);

describe("foldGroups", () => {
  it("moves rows without edits into Conversations without code, with the filter-wide total", () => {
    const out = foldGroups(DEFAULT_VIEW, data, NOW);
    expect(out.map((g) => g.id)).toEqual(["needs_you", "in_progress", "no_edits"]);
    expect(ids(out[0])).toEqual(["b"]);
    expect(out[2]).toMatchObject({ label: "Conversations without code", total: 9 });
    expect(ids(out[2])).toEqual(["a"]);
  });

  it("builds Older only for the 30-day and all-time ranges", () => {
    expect(foldGroups({ ...DEFAULT_VIEW, since: "30d" }, data, NOW).map((g) => g.id)).toEqual([
      "needs_you",
      "in_progress",
      "no_edits",
      "older",
    ]);
    expect(foldGroups({ ...DEFAULT_VIEW, since: "7d" }, data, NOW).some((g) => g.id === "older")).toBe(false);
  });

  it("does not fold when the user filters on edits, or groups by anything but attention", () => {
    for (const view of [
      { ...DEFAULT_VIEW, hasEdits: true },
      { ...DEFAULT_VIEW, hasEdits: false },
      { ...DEFAULT_VIEW, group: "repo" as const },
      { ...DEFAULT_VIEW, group: "none" as const },
    ]) {
      expect(foldGroups(view, data, NOW).map((g) => g.id)).toEqual(["needs_you", "in_progress"]);
    }
  });

  it("never reports fewer than the rows it shows", () => {
    const low = { ...data, facets: { ...data.facets, hasEdits: { true: 0, false: 0 } } };
    expect(foldGroups(DEFAULT_VIEW, low, NOW).find((g) => g.id === "no_edits")?.total).toBe(1);
  });
});
