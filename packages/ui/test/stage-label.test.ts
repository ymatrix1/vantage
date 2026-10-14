// Synthetic data only. The text beside the dots, for every stage and proof combination.
import { describe, expect, it } from "vitest";
import { stageLabel } from "../src/lib/stage-label";

const flag = [{ kind: "k", severity: "red", reason: "r" }];
const base = { stage: "built", proofStatus: "none", proofLevel: 0, docsOnly: false, flags: [] as unknown[] };

describe("stageLabel", () => {
  it.each([
    ["asked", { stage: "asked" }, "Asked"],
    ["asked, flagged", { stage: "asked", flags: flag }, "Asked · needs you"],
    ["built, no proof", {}, "Built · no proof yet"],
    ["built, expired", { proofStatus: "expired" }, "Built · proof expired"],
    ["built, failed", { proofStatus: "failed" }, "Built · proof failed"],
    ["built, weak", { proofStatus: "weak" }, "Built · proof weak"],
    ["built, flagged", { flags: flag }, "Built · needs you"],
    [
      "built, docs only",
      { docsOnly: true, proofStatus: "not_required" },
      "Built · docs only, proof not required",
    ],
    ["built, not required", { proofStatus: "not_required" }, "Built · docs only, proof not required"],
    ["built, docs only, flagged", { docsOnly: true, flags: flag }, "Built · needs you"],
    ["built, unknown proof status", { proofStatus: "odd" }, "Built · no proof yet"],
    ["proven L1", { stage: "proven", proofStatus: "fresh", proofLevel: 1 }, "Proven · L1"],
    ["proven L3", { stage: "proven", proofStatus: "fresh", proofLevel: 3 }, "Proven · L3"],
    ["proven, no level", { stage: "proven", proofStatus: "fresh" }, "Proven"],
    [
      "proven, flagged",
      { stage: "proven", proofStatus: "fresh", proofLevel: 2, flags: flag },
      "Proven · L2 · needs you",
    ],
    ["reviewed", { stage: "reviewed" }, "Reviewed"],
    ["shipped, flagged", { stage: "shipped", flags: flag }, "Shipped · needs you"],
    ["verified", { stage: "verified" }, "Verified"],
    ["unknown stage", { stage: "" }, "Unknown"],
  ])("%s", (_n, over, label) => {
    expect(stageLabel({ ...base, ...over })).toBe(label);
  });
});
