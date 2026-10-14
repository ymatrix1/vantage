import { afterEach, describe, expect, it } from "vitest";
import Dots from "../src/lib/Dots.svelte";
import { cleanup, item, render } from "./helpers";

afterEach(cleanup);

const states = (root: ParentNode): (string | null)[] =>
  [...root.querySelectorAll("svg")].map((s) => s.getAttribute("data-state"));

describe("honest dots (visual-language)", () => {
  it("draws six dots", () => {
    expect(states(render(Dots, { item: item() }))).toHaveLength(6);
  });

  it("shipped and verified are dashed hollow: no configured source can evidence them", () => {
    const root = render(Dots, { item: item({ stage: "proven", proofStatus: "fresh" }) });
    const all = [...root.querySelectorAll("svg")];
    expect(states(root).slice(4)).toEqual(["skipped", "skipped"]);
    for (const svg of all.slice(4)) {
      const c = svg.querySelector("circle");
      expect(c?.getAttribute("fill")).toBe("none");
      expect(c?.getAttribute("stroke-dasharray")).toBeTruthy();
    }
  });

  it("a docs-only item leaves Proven hollow, never green", () => {
    const root = render(Dots, { item: item({ stage: "built", docsOnly: true }) });
    expect(states(root)[2]).toBe("skipped");
    expect(root.querySelectorAll("svg")[2]?.querySelector("circle")?.getAttribute("fill")).toBe("none");
  });

  it("built without proof shows Proven as amber half-filled, not hollow and not green", () => {
    const root = render(Dots, { item: item({ stage: "built" }) });
    const proven = root.querySelectorAll("svg")[2];
    expect(proven?.getAttribute("data-state")).toBe("no_proof");
    expect(proven?.querySelector("path")).not.toBeNull();
  });

  it("future stages are light hollow outlines without dashes", () => {
    const root = render(Dots, { item: item({ stage: "asked" }) });
    const [asked, built] = [...root.querySelectorAll("svg")];
    expect(asked?.getAttribute("data-state")).toBe("current");
    expect(built?.getAttribute("data-state")).toBe("not_yet");
    expect(built?.querySelector("circle")?.getAttribute("fill")).toBe("none");
    expect(built?.querySelector("circle")?.getAttribute("stroke-dasharray")).toBeNull();
  });

  it("a red flag marks the current stage as needing you", () => {
    const flags = [{ kind: "x", severity: "red", reason: "r" }];
    expect(states(render(Dots, { item: item({ stage: "built", flags }) }))[1]).toBe("needs_you");
  });

  it("the accessible label spells each stage's state in words", () => {
    const root = render(Dots, { item: item({ stage: "built" }) });
    const label = root.querySelector("[role='img']")?.getAttribute("aria-label") ?? "";
    expect(label).toContain("shipped: skipped or not set up");
    expect(label).toContain("proven: no proof");
  });
});
