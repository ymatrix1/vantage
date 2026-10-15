// Synthetic data only. The themed Select (D184): the keys of a select-only combobox, no native <select>.
import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Select from "../src/lib/Select.svelte";
import Toolbar from "../src/lib/Toolbar.svelte";
import { DEFAULT_VIEW } from "../src/lib/view";
import { cleanup, emptyFacets, render } from "./helpers";

afterEach(cleanup);

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];
const press = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  flushSync();
};
const box = (root: ParentNode): HTMLButtonElement => root.querySelector("button[role='combobox']")!;

describe("Select", () => {
  it("is closed with the current label, opens on Enter and moves with the arrows", () => {
    const onchange = vi.fn<(v: string) => void>();
    const root = render(Select, { value: "a", options: OPTIONS, label: "Pick", onchange });
    expect(box(root).textContent?.trim()).toBe("Alpha");
    expect(box(root).getAttribute("aria-expanded")).toBe("false");
    press(box(root), "Enter");
    expect(box(root).getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelectorAll("[role='option']")).toHaveLength(3);
    press(box(root), "ArrowDown");
    press(box(root), "ArrowDown");
    expect(root.querySelector("[data-active='true']")?.textContent?.trim()).toBe("Gamma");
    press(box(root), "ArrowDown");
    expect(root.querySelector("[data-active='true']")?.textContent?.trim()).toBe("Gamma");
    press(box(root), "Enter");
    expect(onchange).toHaveBeenCalledWith("c");
    expect(root.querySelector("[role='listbox']")).toBeNull();
  });

  it("Esc closes without changing; Home and End jump; typing jumps to a match", () => {
    const onchange = vi.fn<(v: string) => void>();
    const root = render(Select, { value: "b", options: OPTIONS, label: "Pick", onchange });
    press(box(root), "ArrowDown");
    press(box(root), "Home");
    expect(root.querySelector("[data-active='true']")?.textContent?.trim()).toBe("Alpha");
    press(box(root), "End");
    expect(root.querySelector("[data-active='true']")?.textContent?.trim()).toBe("Gamma");
    press(box(root), "Escape");
    expect(root.querySelector("[role='listbox']")).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    press(box(root), "g");
    expect(onchange).toHaveBeenCalledWith("c");
  });

  it("marks the chosen option, and choosing the current one changes nothing", () => {
    const onchange = vi.fn<(v: string) => void>();
    const root = render(Select, { value: "b", options: OPTIONS, label: "Pick", onchange });
    box(root).click();
    flushSync();
    expect(root.querySelector("[aria-selected='true']")?.textContent?.trim()).toBe("Beta");
    root.querySelectorAll<HTMLElement>("[role='option']")[1]?.click();
    flushSync();
    expect(onchange).not.toHaveBeenCalled();
  });

  it("the toolbar has no native select left", () => {
    const root = render(Toolbar, {
      view: DEFAULT_VIEW,
      facets: emptyFacets(),
      onchange: () => {},
      onclear: () => {},
    });
    expect(root.querySelector("select")).toBeNull();
    expect(
      [...root.querySelectorAll("button[role='combobox']")].map((b) => b.getAttribute("aria-label")),
    ).toEqual(["Group by", "Sort by"]);
  });
});
