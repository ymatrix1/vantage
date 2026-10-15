// Synthetic data only. The dot legend, the stage label on rows and the narrow-width layout classes.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fakeApi, item, press, renderApp, rows, track } from "./helpers";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TrackRow } from "../src/lib/contract";

afterEach(cleanup);

async function ready(items: TrackRow[] = [item({ id: "a", title: "Alpha" })]) {
  fakeApi({ track: () => ({ body: track(items) }) });
  const root = renderApp();
  await vi.waitFor(() => expect(rows(root)).toHaveLength(items.length));
  return root;
}
const panelOf = (root: ParentNode): Element | null => root.querySelector("#dot-legend");
const opener = (root: ParentNode): HTMLButtonElement => {
  const b = [...root.querySelectorAll("button")].find(
    (x) => x.hasAttribute("aria-controls") && x.getAttribute("aria-label")?.includes("what the dots mean"),
  );
  if (!b) throw new Error("no legend button");
  return b;
};
const open = async (root: ParentNode): Promise<Element> => {
  opener(root).click();
  await vi.waitFor(() => expect(panelOf(root)).not.toBeNull());
  return panelOf(root)!;
};

describe("dot legend", () => {
  it("opens and closes with its button, which says whether it is open", async () => {
    const root = await ready();
    expect(panelOf(root)).toBeNull();
    expect(opener(root).getAttribute("aria-expanded")).toBe("false");
    await open(root);
    expect(opener(root).getAttribute("aria-expanded")).toBe("true");
    opener(root).click();
    await vi.waitFor(() => expect(panelOf(root)).toBeNull());
  });

  it("closes with Esc and with its own Close button; ? opens it with the keyboard map", async () => {
    const root = await ready();
    press("?");
    expect(panelOf(root)).not.toBeNull();
    expect(root.querySelector("[aria-label='Keyboard map']")).not.toBeNull();
    press("Escape");
    expect(panelOf(root)).toBeNull();
    expect(root.querySelector("[aria-label='Keyboard map']")).toBeNull();
    const panel = await open(root);
    const close = [...panel.querySelectorAll("button")].find((b) => b.textContent === "Close");
    close?.click();
    await vi.waitFor(() => expect(panelOf(root)).toBeNull());
  });

  it("has an accessible name, all six stages in order and all six states drawn with the real dots", async () => {
    const root = await ready();
    const panel = await open(root);
    const heading = panel.getAttribute("aria-labelledby");
    expect(root.querySelector(`#${heading}`)?.textContent).toBe("What the dots mean");
    const text = panel.textContent ?? "";
    const names = ["Asked", "Built", "Proven", "Reviewed", "Shipped", "Verified"];
    const at = names.map((s) => text.indexOf(s));
    expect(at.every((n) => n >= 0)).toBe(true);
    expect(at.every((n, i) => i === 0 || n > (at[i - 1] ?? 0))).toBe(true);
    const drawn = [...panel.querySelectorAll("svg[data-state]")].map((s) => s.getAttribute("data-state"));
    expect(drawn).toEqual(["done", "current", "no_proof", "needs_you", "skipped", "not_yet"]);
    expect(text).toContain("No source can measure this yet.");
    expect(text).toContain("Edited, but no passing check since.");
    expect(text).toContain("shape carries the meaning");
    expect(text).toContain("never moves a dot");
    // The skipped dot in the legend is the dash; the not-yet dot is the ring.
    expect(panel.querySelector("svg[data-state='skipped'] path")?.getAttribute("d")).toBe("M5 8h6");
    expect(panel.querySelector("svg[data-state='not_yet'] circle")).not.toBeNull();
  });

  it("is not modal and traps no focus", async () => {
    const root = await ready();
    const panel = await open(root);
    expect(panel.getAttribute("role")).toBeNull();
    expect(panel.getAttribute("aria-modal")).toBeNull();
    expect(panel.querySelectorAll("[tabindex]")).toHaveLength(0);
    expect(opener(root).tabIndex).toBeGreaterThanOrEqual(0);
  });
});

describe("row stage label", () => {
  it("shows the label beside the dots and keeps the dots at every width", async () => {
    const root = await ready([item({ id: "a", title: "Alpha", stage: "built", proofStatus: "none" })]);
    const row = rows(root)[0];
    const label = [...(row?.querySelectorAll("span") ?? [])].find(
      (s) => s.textContent === "Built · no proof yet" && s.classList.contains("md:block"),
    );
    expect(label).toBeDefined();
    // Wide screens: its own column. Narrow: hidden there and repeated beside the repo, so the text is never lost.
    expect(label?.classList.contains("hidden")).toBe(true);
    expect(row?.querySelector("span.md\\:hidden")?.textContent).toContain("Built · no proof yet");
    const dots = row?.querySelector("[role='img']");
    expect(dots?.classList.contains("hidden")).toBe(false);
    expect(dots?.classList.contains("shrink-0")).toBe(true);
  });

  it("labels each row from its own fields", async () => {
    const root = await ready([
      item({ id: "a", title: "A", stage: "proven", proofStatus: "fresh", proofLevel: 1 }),
      item({ id: "b", title: "B", stage: "asked" }),
      item({ id: "c", title: "C", stage: "built", docsOnly: true, proofStatus: "not_required" }),
    ]);
    const text = rows(root).map((r) => r.textContent ?? "");
    expect(text[0]).toContain("Proven · L1");
    expect(text[1]).toContain("Asked");
    expect(text[2]).toContain("Built · docs only, proof not required");
  });

  it("renders markup in titles, labels and the legend as text", async () => {
    const root = await ready([
      item({ id: "x", title: `<b id="injected">t</b>`, stage: `<img src=x onerror="window.pwned=1">` }),
    ]);
    await open(root);
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector("#injected")).toBeNull();
    expect(rows(root)[0]?.textContent).toContain("<img");
    expect(Reflect.get(window, "pwned")).toBeUndefined();
  });
});

describe("forced colours", () => {
  it("the stylesheet gives every dot shape a forced-colours rule so the dash stays visible", () => {
    const css = readFileSync(join(import.meta.dirname, "../src/app.css"), "utf8");
    expect(css).toMatch(/@media \(forced-colors: active\)[\s\S]*svg\[data-state\] path[\s\S]*CanvasText/);
  });
});
