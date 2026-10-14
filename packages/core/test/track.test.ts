// Synthetic data only.
import { describe, expect, it } from "vitest";
import { attentionOf, dotsFor, fallbackTitle, parseTrackQuery, type TrackQuery } from "../src/track.ts";

const base = { proofStatus: "none", docsOnly: false, flags: [] as { severity: string }[] };

describe("attentionOf", () => {
  it("puts any open flag under Needs you, the rest In progress", () => {
    expect(attentionOf({ stage: "built", flags: [{ severity: "amber" }] })).toBe("needs_you");
    expect(attentionOf({ stage: "built", flags: [] })).toBe("in_progress");
    expect(attentionOf({ stage: "verified", flags: [] })).toBe("done");
  });
});

describe("dotsFor", () => {
  it("always returns six dots; stages no source can evidence are dashed, never green", () => {
    const d = dotsFor({ ...base, stage: "proven", proofStatus: "fresh" });
    expect(d).toHaveLength(6);
    expect(d).toEqual(["done", "done", "done", "skipped", "skipped", "skipped"]);
  });

  it("shows Built as current and Proven as amber half-filled while unproven", () => {
    expect(dotsFor({ ...base, stage: "built" })).toEqual([
      "done",
      "current",
      "no_proof",
      "skipped",
      "skipped",
      "skipped",
    ]);
  });

  it("starts with Asked current and later stages not yet", () => {
    expect(dotsFor({ ...base, stage: "asked" }).slice(0, 3)).toEqual(["current", "not_yet", "not_yet"]);
  });

  it("makes Proven hollow for a docs-only item (no proof required)", () => {
    expect(dotsFor({ ...base, stage: "built", docsOnly: true, proofStatus: "not_required" })[2]).toBe(
      "skipped",
    );
  });

  it("marks the current dot red when a red flag is open", () => {
    expect(dotsFor({ ...base, stage: "built", flags: [{ severity: "red" }] })[1]).toBe("needs_you");
  });
});

const parse = (qs: string): ReturnType<typeof parseTrackQuery> => parseTrackQuery(new URLSearchParams(qs));
const ok = (qs: string): TrackQuery => {
  const r = parse(qs);
  if (!r.ok) throw new Error(r.error);
  return r.query;
};

describe("parseTrackQuery", () => {
  it("defaults: 7d, activity desc, grouped by attention, page 1 of 25", () => {
    expect(ok("")).toEqual({
      repo: [],
      branch: [],
      stage: [],
      proof: [],
      flag: [],
      since: "7d",
      hasEdits: null,
      q: "",
      sort: "activity",
      order: "desc",
      group: "attention",
      page: 1,
      pageSize: 25,
    });
  });

  it("accepts every parameter", () => {
    const q = ok(
      "repo=a,b&branch=main&stage=asked,built&proof=none,fresh&flag=thrashing,none&since=all&hasEdits=false&q=Foo&sort=flags&order=asc&group=repo&page=3&pageSize=100",
    );
    expect(q).toMatchObject({
      repo: ["a", "b"],
      branch: ["main"],
      stage: ["asked", "built"],
      proof: ["none", "fresh"],
      flag: ["thrashing", "none"],
      since: "all",
      hasEdits: false,
      q: "Foo",
      sort: "flags",
      order: "asc",
      group: "repo",
      page: 3,
      pageSize: 100,
    });
  });

  it("treats an empty value as unset and drops empty list segments and repeats", () => {
    expect(ok("repo=&stage=built,,built&q=").stage).toEqual(["built"]);
  });

  it.each([
    "stage=nope",
    "stage=built,nope",
    "proof=maybe",
    "flag=red",
    "since=1y",
    "hasEdits=yes",
    "sort=title;drop",
    "order=up",
    "group=owner",
    "page=0",
    "page=-1",
    "page=1.5",
    "page=abc",
    "page=99999999999",
    "pageSize=101",
    "pageSize=0",
    `q=${"x".repeat(81)}`,
    `repo=${"x".repeat(201)}`,
    `repo=${Array.from({ length: 51 }, (_, i) => `r${i}`).join(",")}`,
    "bogus=1",
    "page=1&page=2",
  ])("rejects %s with a plain error", (qs) => {
    expect(parse(qs)).toEqual({
      ok: false,
      error: expect.stringMatching(/^(bad value for \w+|unknown parameter|repeated parameter: \w+)$/),
    });
  });

  it("never echoes a rejected value", () => {
    const r = parse("stage=<script>");
    expect(r).toEqual({ ok: false, error: "bad value for stage" });
  });
});

describe("fallbackTitle", () => {
  const first = "2026-10-14T09:00:00Z";
  it("joins repo, branch and the first activity date", () => {
    expect(
      fallbackTitle({ repo: "claude-code", branch: "main", firstActivity: first, id: "abcdef123456" }),
    ).toBe("claude-code · main · Oct 14");
  });
  it("skips what is unknown, and falls back to the short session id with the date", () => {
    expect(fallbackTitle({ repo: null, branch: "main", firstActivity: first, id: "abcdef123456" })).toBe(
      "main · Oct 14",
    );
    expect(fallbackTitle({ repo: null, branch: null, firstActivity: first, id: "abcdef123456" })).toBe(
      "Session abcdef12 · Oct 14",
    );
    expect(fallbackTitle({ repo: "r", branch: null, firstActivity: "", id: "x" })).toBe("r");
  });
});
