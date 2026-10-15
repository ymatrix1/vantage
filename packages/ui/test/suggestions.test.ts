// Synthetic data only. The suggestions bar with a faked fetch (D82: mount + faked fetch, no real daemon).
import { flushSync } from "svelte";
import type { Component } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Suggestions from "../src/lib/Suggestions.svelte";
import { TOKEN, cleanup, render } from "./helpers";

afterEach(cleanup);

const counts = (t: number, p = 0, g = 0) => ({
  open: { title: t, topic: p, group: g },
  accepted: 0,
  dismissed: 0,
  undone: 0,
});
const status = (over: Record<string, unknown> = {}) => ({
  enabled: true,
  blockers: [],
  model: "haiku",
  dailyCalls: 50,
  callsToday: 0,
  autoAccept: "off",
  job: {
    state: "idle",
    callsDone: 0,
    callsPlanned: 0,
    callsFailed: 0,
    suggestions: 0,
    capReached: false,
    stoppedEarly: false,
    lastAuto: null,
  },
  counts: counts(3, 2, 1),
  lastBatch: null,
  ...over,
});
const HOSTILE = `<img src=x onerror="window.pwned=1">`;
const row = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  itemKey: `session:${id}`,
  kind: "title",
  confidence: 0.9,
  summary: `Title ${id}`,
  reason: "synthetic",
  itemTitle: `Session ${id}`,
  repo: null,
  ...over,
});

function api(routes: Record<string, (body: unknown) => unknown>) {
  const fn = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async (input, init) => {
    const path = input.split("?")[0] ?? input;
    const handler = routes[`${init?.method ?? "GET"} ${path}`];
    if (!handler) return new Response("{}", { status: 404 });
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    try {
      return new Response(JSON.stringify(handler(body)), { status: 200 });
    } catch {
      return new Response("{}", { status: 500 });
    }
  });
  vi.stubGlobal("fetch", fn);
  sessionStorage.setItem("vantage.token", TOKEN);
  return fn;
}
const mountBar = async (onchange = () => {}) => {
  const root = render(Suggestions as Component<{ onchange?: () => void }>, { onchange });
  await vi.waitFor(() => expect(root.querySelector("section")).not.toBeNull());
  return root;
};
const button = (root: ParentNode, text: string) =>
  [...root.querySelectorAll("button")].find((b) => b.textContent?.includes(text));
const click = async (el: HTMLElement | undefined) => {
  el?.click();
  flushSync();
  await new Promise((r) => setTimeout(r, 0));
  flushSync();
};

describe("suggestions bar", () => {
  it("shows counts, and the batch undo only when there is a batch", async () => {
    api({ "GET /api/classify/status": () => status() });
    const root = await mountBar();
    expect(root.querySelector("[data-testid=counts]")?.textContent).toContain(
      "3 titles · 2 topics · 1 groups",
    );
    expect(button(root, "Undo this batch")).toBeUndefined();
  });

  it("says the classifier is off, and offers no accept, when nothing is waiting and it is disabled", async () => {
    api({ "GET /api/classify/status": () => status({ enabled: false, counts: counts(0) }) });
    const root = await mountBar();
    expect(root.textContent).toContain("The classifier is off");
    expect(button(root, "Accept all")).toBeUndefined();
  });

  it("Accept all previews first and applies nothing until Confirm; Cancel applies nothing", async () => {
    const applied = vi.fn<(body: unknown) => void>();
    api({
      "GET /api/classify/status": () => status(),
      "POST /api/classify/preview": () => ({
        total: 6,
        byKind: { title: 3, topic: 2, group: 1 },
        sample: [row(1)],
        token: "tok",
      }),
      "POST /api/classify/apply": (b) => {
        applied(b);
        return { total: 6, batchId: "b1" };
      },
    });
    const changed = vi.fn<() => void>();
    const root = await mountBar(changed);
    await click(button(root, "Accept all"));
    expect(root.querySelector("[data-testid=preview]")?.textContent).toContain(
      "Nothing is applied until you confirm",
    );
    expect(applied).not.toHaveBeenCalled();
    await click(button(root, "Cancel"));
    expect(root.querySelector("[data-testid=preview]")).toBeNull();
    expect(applied).not.toHaveBeenCalled();
    await click(button(root, "Accept all"));
    await click(button(root, "Confirm"));
    expect(applied).toHaveBeenCalledWith({ action: "accept", filter: { minConfidence: 0.8 }, token: "tok" });
    expect(changed).toHaveBeenCalled();
    expect(root.textContent).toContain("Accepted 6.");
  });

  it("Undo this batch calls undo and tells the page", async () => {
    const undone = vi.fn<() => void>();
    api({
      "GET /api/classify/status": () =>
        status({
          lastBatch: {
            id: "b1",
            action: "accept",
            counts: { title: 2, topic: 0, group: 0 },
            total: 2,
            createdAt: "x",
            undone: false,
          },
        }),
      "POST /api/classify/undo": () => {
        undone();
        return { undone: { id: "b1", total: 2 } };
      },
    });
    const changed = vi.fn<() => void>();
    const root = await mountBar(changed);
    await click(button(root, "Undo this batch (2)"));
    expect(undone).toHaveBeenCalled();
    expect(changed).toHaveBeenCalled();
    expect(root.textContent).toContain("Undid a batch of 2.");
  });

  it("Review lists rows with Accept and Dismiss per row, and renders model text as text", async () => {
    const decided = vi.fn<(body: unknown) => void>();
    api({
      "GET /api/classify/status": () => status(),
      "GET /api/classify/suggestions": () => ({
        total: 1,
        rows: [row(7, { summary: HOSTILE, reason: HOSTILE })],
      }),
      "POST /api/classify/decide": (b) => {
        decided(b);
        return {};
      },
    });
    const root = await mountBar();
    await click(button(root, "Review"));
    const list = root.querySelector("[data-testid=review]");
    expect(list?.textContent).toContain(HOSTILE);
    expect(list?.querySelector("img")).toBeNull();
    await click(button(list ?? document.body, "Dismiss"));
    expect(decided).toHaveBeenCalledWith({ action: "dismiss", id: 7 });
  });

  it("an error leaves the bar usable and says nothing changed", async () => {
    api({
      "GET /api/classify/status": () => status(),
      "POST /api/classify/preview": () => {
        throw new Error("boom");
      },
    });
    const root = await mountBar();
    await click(button(root, "Accept all"));
    expect(root.querySelector("[role=alert]")?.textContent).toContain("Nothing was changed");
  });
});
