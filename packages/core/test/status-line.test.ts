// Synthetic summaries only.
import { describe, expect, it } from "vitest";
import {
  parseStatusSummary,
  renderStatusLine,
  shortTitle,
  type StatusItem,
  type StatusSummary,
} from "../src/index.ts";

const now = new Date("2026-01-05T10:00:00Z");
const item = (o: Partial<StatusItem> = {}): StatusItem => ({
  stage: "built",
  proofStatus: "none",
  proofLevel: 0,
  docsOnly: false,
  repo: "billing-api",
  title: "Checkout fixes",
  flags: [],
  ...o,
});
const summary = (st: StatusItem, o: Partial<StatusSummary> = {}): StatusSummary => ({
  v: 1,
  writtenAt: "2026-01-05T09:59:00Z",
  needsYou: 0,
  pings: 0,
  sessions: { s1: st },
  ...o,
});
const line = (s: StatusSummary | null, o = {}) =>
  renderStatusLine(s, { sessionId: "s1", columns: 80, now, ...o });
const len = (t: string) => Array.from(t).length;

describe("track glyphs per stage and proof state", () => {
  const proven = { stage: "proven", proofStatus: "fresh" } as const;
  it.each([
    ["asked", item({ stage: "asked" }), "●◉○○○○"],
    ["built, no proof", item(), "●●◐○○○"],
    ["built, expired proof", item({ proofStatus: "expired" }), "●●◐○○○"],
    ["built, failed proof", item({ proofStatus: "failed" }), "●●◐○○○"],
    ["built, weak proof", item({ proofStatus: "weak" }), "●●◐○○○"],
    ["proven L1", item({ ...proven, proofLevel: 1 }), "●●●¹○○○"],
    ["proven L2", item({ ...proven, proofLevel: 2 }), "●●●²○○○"],
    ["docs only", item({ docsOnly: true, proofStatus: "not_required" }), "●●◌○○○"],
    ["built with flag", item({ flags: ["unproven_claim"] }), "●●◍!○○○"],
    ["asked with flag", item({ stage: "asked", flags: ["forgotten"] }), "●◍!○○○○"],
    ["proven with flag", item({ ...proven, proofLevel: 2, flags: ["thrashing"] }), "●●◍!○○○"],
  ])("%s", (_n, st, glyphs) => {
    expect(line(summary(st))).toBe(`vantage · billing-api · ${glyphs} Checkout fixes`);
  });
});

describe("layout", () => {
  it("matches the spec example with needs-you and pings", () => {
    const s = summary(item(), { needsYou: 2, pings: 1 });
    expect(line(s)).toBe("vantage · billing-api · ●●◐○○○ Checkout fixes · 2 need you · 1 owe reply");
  });

  it("colors by state when asked, and has the same text without color", () => {
    const s = summary(item(), { needsYou: 2 });
    const colored = line(s, { color: true });
    expect(colored).toContain("\u001b[32m●\u001b[0m");
    expect(colored).toContain("\u001b[33m◐\u001b[0m");
    expect(colored).toContain("\u001b[31m2 need you\u001b[0m");
    // oxlint-disable-next-line no-control-regex
    expect(colored.replace(/\u001b\[\d+m/g, "")).toBe(line(s));
  });

  it("falls back to the stdin repo and no track when the session has no item", () => {
    expect(line(summary(item()), { sessionId: "other", repo: "api" })).toBe("vantage · api");
    expect(line(summary(item(), { needsYou: 3 }), { sessionId: "other", repo: "api" })).toBe(
      "vantage · api · 3 need you",
    );
  });

  it("quiet mode shows only the needs-you count", () => {
    expect(line(summary(item(), { needsYou: 2 }), { quiet: true })).toBe("vantage · 2 need you");
    expect(line(summary(item()), { quiet: true })).toBe("vantage · nothing needs you");
  });

  it("cleans titles to at most four words", () => {
    expect(shortTitle("feat/ftk-1-demo-of-things-here")).toBe("ftk 1 demo of");
    expect(shortTitle("Session abcd1234")).toBe("Session abcd1234");
  });
});

describe("width", () => {
  const s = summary(item({ title: "Checkout fixes for refunds" }), { needsYou: 2, pings: 1 });

  it.each([80, 60, 40])("never exceeds %i columns", (cols) => {
    expect(len(line(s, { columns: cols }))).toBeLessThanOrEqual(cols);
  });

  it("at 80 columns drops pings and keeps the rest", () => {
    expect(line(s, { columns: 80 })).toBe(
      "vantage · billing-api · ●●◐○○○ Checkout fixes for refunds · 2 need you",
    );
  });

  it("at 60 columns shortens the title with an ellipsis", () => {
    const out = line(s, { columns: 60 });
    expect(out).toMatch(/^vantage · billing-api · ●●◐○○○ Checkout .*… · 2 need you$/);
    expect(len(out)).toBeLessThanOrEqual(60);
  });

  it("shows only the head and the needs-you count under 50 columns", () => {
    expect(line(s, { columns: 40 })).toBe("vantage · billing-api · 2 need you");
    expect(line(s, { columns: 49 })).toBe("vantage · billing-api · 2 need you");
  });

  it("keeps cutting when nothing else fits", () => {
    expect(len(line(s, { columns: 20 }))).toBe(20);
    expect(line(s, { columns: 20 })).toMatch(/…$/);
    expect(len(line(s, { columns: 12 }))).toBe(12);
  });

  it("counts the ◍! glyph as two columns", () => {
    const flagged = summary(item({ flags: ["unproven_claim"] }), { needsYou: 1 });
    for (const cols of [50, 55, 60, 70, 80]) {
      expect(len(line(flagged, { columns: cols }))).toBeLessThanOrEqual(cols);
    }
  });
});

describe("daemon down", () => {
  it("no file: calm offline line", () => {
    expect(renderStatusLine(null, { sessionId: "s1", now })).toBe("vantage · offline");
  });

  it("summary older than 5 minutes: stale", () => {
    expect(line(summary(item(), { writtenAt: "2026-01-05T09:54:59Z" }))).toBe("vantage · stale");
    expect(line(summary(item(), { writtenAt: "2026-01-05T09:55:00Z" }))).toContain("billing-api");
  });

  it("unparsable timestamp is stale, not a crash", () => {
    expect(line(summary(item(), { writtenAt: "garbage" }))).toBe("vantage · stale");
  });
});

describe("parseStatusSummary", () => {
  it("round-trips a summary", () => {
    const s = summary(item({ flags: ["thrashing"] }), { needsYou: 1 });
    expect(parseStatusSummary(JSON.stringify(s))).toEqual(s);
  });

  it.each(["", "not json", "[]", "null", '{"v":2,"writtenAt":"x"}', '{"v":1}'])("rejects %j", (t) => {
    expect(parseStatusSummary(t)).toBeNull();
  });

  it("skips malformed sessions and defaults missing fields", () => {
    const s = parseStatusSummary(
      JSON.stringify({
        v: 1,
        writtenAt: "x",
        needsYou: -3,
        sessions: { a: 1, b: { stage: "shipped" }, c: { stage: "built" } },
      }),
    );
    expect(s?.needsYou).toBe(0);
    expect(Object.keys(s?.sessions ?? {})).toEqual(["c"]);
    expect(s?.sessions["c"]).toMatchObject({ proofStatus: "none", flags: [], title: "" });
  });
});
