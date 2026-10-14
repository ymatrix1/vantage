// Synthetic data only.
import { describe, expect, it } from "vitest";
import { attentionOf, dotsFor } from "../src/track.ts";

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
