// Synthetic data only. The top view, day grouping and the control classes (D181, D182).
import { describe, expect, it } from "vitest";
import { sectionsOf } from "../src/lib/projects";
import { apiQuery, DEFAULT_VIEW, parseView } from "../src/lib/view";
import { summaryOf } from "../src/lib/summary";
import { group, item, track } from "./helpers";

const now = new Date(2026, 9, 15, 12, 0, 0);
const at = (daysAgo: number): string => new Date(2026, 9, 15 - daysAgo, 9, 0, 0).toISOString();

describe("day grouping (D181)", () => {
  it("folds rows by local day, newest first, named Today, Yesterday, then the date", () => {
    const rows = [
      item({ id: "a", lastActivity: at(3) }),
      item({ id: "b", lastActivity: at(0) }),
      item({ id: "c", lastActivity: at(1) }),
      item({ id: "d", lastActivity: at(0) }),
    ];
    const s = sectionsOf("day", [group("all", "All items", rows)], now);
    expect(s.map((x) => [x.label.split(",")[0], x.items.map((i) => i.id).join("")])).toEqual([
      ["Today", "bd"],
      ["Yesterday", "c"],
      ["Mon", "a"],
    ]);
  });

  it("is the page's own grouping: the API is asked for none", () => {
    const v = parseView("group=day");
    expect(v.group).toBe("day");
    expect(apiQuery(v)).toContain("group=none");
    expect(apiQuery(DEFAULT_VIEW)).toContain("group=repo");
  });
});

describe("summaryOf, the overview's data", () => {
  it("keeps the top three needs-you and in-progress rows and the stage counts", () => {
    const flag = { kind: "thrashing", severity: "amber", reason: "3 failing edit cycles" };
    const needs = ["1", "2", "3", "4"].map((id) => item({ id, flags: [flag] }));
    const v = track([], {
      groups: [
        group("needs_you", "Needs you", needs, 9),
        group("in_progress", "In progress", [item({ id: "p" })]),
      ],
    });
    v.facets.stage = { asked: 1, built: 5, proven: 2 };
    const s = summaryOf(v);
    expect(s.needs.map((i) => i.id)).toEqual(["1", "2", "3"]);
    expect(s.progress.map((i) => i.id)).toEqual(["p"]);
    expect(s.stages).toEqual({ asked: 1, built: 5, proven: 2 });
  });
});

const propsFor = (repo: string | null) => ({
  item: item({ repo, branch: repo ? "feat/x" : null }),
  idx: 0,
  selected: false,
  isOpen: false,
  now,
  trace: null,
  detail: null,
  detailFailed: false,
  traceFailed: false,
  onselect: () => {},
});

describe("row columns", () => {
  it("a row without a branch link still reserves the icon column, so dots and stage text line up", async () => {
    const { render } = await import("./helpers");
    const Row = (await import("../src/lib/Row.svelte")).default;
    const root = render(Row, propsFor(null));
    const slot = root.querySelector("li > div > button")?.nextElementSibling;
    expect(slot?.className).toMatch(/w-10/);
    expect(root.querySelector("button span.shrink-0 [role='img']")?.parentElement?.className).toContain(
      "w-[",
    );
  });
});
