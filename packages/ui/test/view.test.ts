// Synthetic data only. The view state <-> query string rules (no DOM, no network).
import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW, activeFilters, blockers, clearFilters, parseView, toQuery } from "../src/lib/view";
import { emptyFacets } from "./helpers";

describe("toQuery and parseView", () => {
  it("the default view is an empty URL and a full API request", () => {
    expect(toQuery(DEFAULT_VIEW)).toBe("");
    expect(toQuery(DEFAULT_VIEW, true)).toBe("since=7d&sort=activity&order=desc&group=attention&pageSize=25");
  });

  it("round-trips every control, writing only what differs from the default", () => {
    const v = {
      ...DEFAULT_VIEW,
      q: "retry sync",
      repo: ["acme/sync", "acme/web"],
      branch: ["feat/a b"],
      stage: ["built", "proven"],
      proof: ["none"],
      flag: ["thrashing", "none"],
      since: "30d" as const,
      hasEdits: true,
      sort: "title" as const,
      order: "desc" as const,
      group: "repo" as const,
      page: 3,
      pageSize: 50,
    };
    const q = toQuery(v);
    expect(q).toBe(
      "repo=acme%2Fsync,acme%2Fweb&branch=feat%2Fa%20b&stage=built,proven&proof=none&flag=thrashing,none&q=retry%20sync&since=30d&hasEdits=true&sort=title&order=desc&group=repo&page=3&pageSize=50",
    );
    expect(parseView(q)).toEqual(v);
  });

  it("an ascending sort by title is the default direction and is not written", () => {
    expect(toQuery({ ...DEFAULT_VIEW, sort: "title", order: "asc" })).toBe("sort=title");
    expect(parseView("sort=title").order).toBe("asc");
  });

  it("drops unknown or hostile values instead of passing them on", () => {
    const v = parseView(
      "stage=built,drop%20table&proof=bogus&since=1y&sort=x&group=y&page=-4&pageSize=7&hasEdits=maybe&order=up",
    );
    expect(v.stage).toEqual(["built"]);
    expect(v.proof).toEqual([]);
    expect([v.since, v.sort, v.group, v.page, v.pageSize, v.hasEdits, v.order]).toEqual([
      "7d",
      "activity",
      "attention",
      1,
      25,
      null,
      "desc",
    ]);
  });

  it("caps the search text at 80 characters and the repeated values at 50", () => {
    expect(parseView(`q=${"a".repeat(200)}`).q).toHaveLength(80);
    const many = Array.from({ length: 80 }, (_, i) => `r${i}`).join(",");
    expect(parseView(`repo=${many}`).repo).toHaveLength(50);
  });

  it("has no way to carry a token", () => {
    const v = parseView("token=" + "ab".repeat(16) + "&q=x");
    expect(toQuery(v, true)).not.toContain("token");
    expect(toQuery(v, true)).not.toContain("abab");
  });
});

describe("filters", () => {
  it("lists the narrowing filters and clears them but keeps sort, group and page size", () => {
    const v = {
      ...DEFAULT_VIEW,
      repo: ["a"],
      hasEdits: true as const,
      since: "all" as const,
      sort: "repo" as const,
      group: "stage" as const,
      pageSize: 100,
      page: 4,
    };
    expect(activeFilters(v)).toEqual(["repo", "since", "hasEdits"]);
    expect(clearFilters(v)).toEqual({
      ...DEFAULT_VIEW,
      sort: "repo",
      order: "desc",
      group: "stage",
      pageSize: 100,
    });
  });

  it("blockers say how many items each filter hides", () => {
    const f = {
      ...emptyFacets(),
      repo: { a: 3, b: 2 },
      hasEdits: { true: 4, false: 1 },
      age: { today: 1, week: 1, older: 2 },
    };
    const v = { ...DEFAULT_VIEW, repo: ["c"], hasEdits: true as const, q: "zz" };
    expect(blockers(v, f)).toEqual([
      { filter: "repo", wouldShow: 5 },
      { filter: "hasEdits", wouldShow: 5 },
      { filter: "search", wouldShow: null },
      { filter: "since", wouldShow: 4 },
    ]);
  });
});
