import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fakeApi, item, press, renderApp, rows, track, traceOf } from "./helpers";

afterEach(cleanup);

const THREE = [
  item({ id: "a", title: "First" }),
  item({ id: "b", title: "Second" }),
  item({ id: "c", title: "Third" }),
];

async function ready() {
  const api = fakeApi({
    track: () => ({ body: track(THREE) }),
    trace: (id) => ({ body: traceOf(id) }),
  });
  const root = renderApp();
  await vi.waitFor(() => expect(rows(root)).toHaveLength(3));
  return { root, api };
}

const current = (root: ParentNode): string[] =>
  [...root.querySelectorAll("li[aria-current='true']")].map((li) => li.textContent ?? "");

describe("keyboard map (web-ui spec)", () => {
  it("j selects the first row, then moves down and stops at the last", async () => {
    const { root } = await ready();
    expect(current(root)).toHaveLength(0);
    press("j");
    expect(current(root)[0]).toContain("First");
    press("j");
    expect(current(root)[0]).toContain("Second");
    press("j");
    press("j");
    expect(current(root)[0]).toContain("Third");
  });

  it("k moves up and stops at the first row; first k selects the last", async () => {
    const { root } = await ready();
    press("k");
    expect(current(root)[0]).toContain("Third");
    press("k");
    press("k");
    press("k");
    expect(current(root)[0]).toContain("First");
  });

  it("Enter opens the trace of the selected row and fetches it", async () => {
    const { root, api } = await ready();
    press("j");
    press("Enter");
    await vi.waitFor(() => expect(root.textContent).toContain("Stage history"));
    expect(api).toHaveBeenCalledWith("/api/items/a/trace", expect.anything());
    expect(rows(root)[0]?.getAttribute("aria-expanded")).toBe("true");
  });

  it("Enter without a selection does nothing", async () => {
    const { root } = await ready();
    press("Enter");
    expect(root.textContent).not.toContain("Stage history");
  });

  it("Enter on an open row closes it", async () => {
    const { root } = await ready();
    press("j");
    press("Enter");
    await vi.waitFor(() => expect(root.textContent).toContain("Stage history"));
    press("Enter");
    expect(root.textContent).not.toContain("Stage history");
  });

  it("Esc closes the open trace", async () => {
    const { root } = await ready();
    press("j");
    press("Enter");
    await vi.waitFor(() => expect(root.textContent).toContain("Stage history"));
    press("Escape");
    expect(root.textContent).not.toContain("Stage history");
    expect(rows(root)[0]?.getAttribute("aria-expanded")).toBe("false");
  });

  it("? shows the keyboard map and ? again hides it", async () => {
    const { root } = await ready();
    expect(root.querySelector("[aria-label='Keyboard map']")).toBeNull();
    press("?");
    expect(root.querySelector("[aria-label='Keyboard map']")).not.toBeNull();
    press("?");
    expect(root.querySelector("[aria-label='Keyboard map']")).toBeNull();
  });

  it("Esc closes the help first and leaves an open trace alone", async () => {
    const { root } = await ready();
    press("j");
    press("Enter");
    await vi.waitFor(() => expect(root.textContent).toContain("Stage history"));
    press("?");
    press("Escape");
    expect(root.querySelector("[aria-label='Keyboard map']")).toBeNull();
    expect(root.textContent).toContain("Stage history");
  });

  it("ignores keys typed into inputs and keys with ctrl, meta or alt", async () => {
    const { root } = await ready();
    const input = document.body.appendChild(document.createElement("input"));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true }));
    press("j", { ctrlKey: true });
    press("j", { metaKey: true });
    press("j", { altKey: true });
    expect(current(root)).toHaveLength(0);
  });

  it("clicking a row selects it and opens its trace", async () => {
    const { root } = await ready();
    rows(root)[1]?.click();
    await vi.waitFor(() => expect(root.textContent).toContain("Stage history"));
    expect(current(root)[0]).toContain("Second");
  });
});
