import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Dots from "../src/lib/Dots.svelte";
import { setColourBlind } from "../src/lib/settings.svelte";
import { cleanup, item, render } from "./helpers";

afterEach(() => {
  cleanup();
  setColourBlind(false);
});

// Skipped is a short horizontal dash, 6 units plus round caps, and has no ring at all.
function expectDash(svg: Element | undefined): void {
  expect(svg?.querySelector("circle")).toBeNull();
  const dash = svg?.querySelector("path");
  expect(dash?.getAttribute("d")).toBe("M5 8h6");
  expect(dash?.getAttribute("stroke-width")).toBe("2");
  expect(dash?.getAttribute("stroke-linecap")).toBe("round");
  expect(dash?.getAttribute("stroke")).toBe("var(--dot-gray)");
}

const states = (root: ParentNode): (string | null)[] =>
  [...root.querySelectorAll("svg")].map((s) => s.getAttribute("data-state"));

const fills = (root: ParentNode): (string | null | undefined)[] =>
  [...root.querySelectorAll("svg")].map((s) => s.querySelector("circle")?.getAttribute("fill"));

describe("full-colour dots, the default (D183)", () => {
  it("every state but skipped is one filled circle in its own colour", () => {
    const flags = [{ kind: "x", severity: "red", reason: "r" }];
    expect(fills(render(Dots, { item: item({ stage: "built" }) }))).toEqual([
      "var(--dot-green)",
      "var(--dot-blue)",
      "var(--dot-amber)",
      undefined,
      undefined,
      undefined,
    ]);
    expect(fills(render(Dots, { item: item({ stage: "asked" }) }))[1]).toBe("var(--dot-light)");
    expect(fills(render(Dots, { item: item({ stage: "built", flags }) }))[1]).toBe("var(--dot-red)");
    for (const svg of render(Dots, { item: item() }).querySelectorAll(
      "svg[data-state]:not([data-state='skipped'])",
    )) {
      expect(svg.querySelectorAll("circle")).toHaveLength(1);
      expect(svg.querySelector("path")).toBeNull();
    }
  });

  it("colour is never the only signal: each dot has a title and the row names every state", () => {
    const root = render(Dots, { item: item({ stage: "built" }) });
    for (const svg of root.querySelectorAll("svg"))
      expect(svg.querySelector("title")?.textContent).toMatch(/: \w/);
    expect(root.querySelector("[role='img']")?.getAttribute("aria-label")).toContain("built: in progress");
  });
});

describe("colour-blind friendly dots: the shape-first style of D34", () => {
  it("switches to ring, half and dash, and back", () => {
    setColourBlind(true);
    const root = render(Dots, { item: item({ stage: "built" }) });
    expect(root.querySelectorAll("svg")[1]?.querySelector("circle")?.getAttribute("fill")).toBe("none");
    expect(root.querySelectorAll("svg")[2]?.querySelector("path")).not.toBeNull();
    expect(document.documentElement.dataset["cb"]).toBe("1");
    setColourBlind(false);
    expect(document.documentElement.dataset["cb"]).toBeUndefined();
  });
});

describe("honest dots (visual-language), shape style", () => {
  beforeEach(() => setColourBlind(true));

  it("draws six dots", () => {
    expect(states(render(Dots, { item: item() }))).toHaveLength(6);
  });

  it("shipped and verified are a short dash with no ring: no configured source can evidence them", () => {
    const root = render(Dots, { item: item({ stage: "proven", proofStatus: "fresh" }) });
    const all = [...root.querySelectorAll("svg")];
    expect(states(root).slice(4)).toEqual(["skipped", "skipped"]);
    for (const svg of all.slice(4)) expectDash(svg);
  });

  it("a docs-only item leaves Proven as a dash, never green", () => {
    const root = render(Dots, { item: item({ stage: "built", docsOnly: true }) });
    expect(states(root)[2]).toBe("skipped");
    expectDash(root.querySelectorAll("svg")[2]);
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
    expect(built?.querySelector("circle")?.getAttribute("stroke-width")).toBe("1");
    expect(built?.querySelector("path")).toBeNull();
  });

  it("a red flag marks the current stage as needing you", () => {
    const flags = [{ kind: "x", severity: "red", reason: "r" }];
    expect(states(render(Dots, { item: item({ stage: "built", flags }) }))[1]).toBe("needs_you");
  });

  it("the accessible label spells each stage's state in words", () => {
    const root = render(Dots, { item: item({ stage: "built" }) });
    const label = root.querySelector("[role='img']")?.getAttribute("aria-label") ?? "";
    expect(label).toContain("shipped: no source can measure this yet");
    expect(label).toContain("proven: no proof");
  });
});
