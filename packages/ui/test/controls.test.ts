// Synthetic data only. The Track toolbar, pagination, groups and URL state (D82: mount + faked fetch).
import { flushSync } from "svelte";
import type { Component } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.svelte";
import type { TrackView } from "../src/lib/contract";
import {
  listCalls,
  TOKEN,
  cleanup,
  emptyFacets,
  FakeSocket,
  fakeApi,
  group,
  item,
  press,
  render,
  renderApp,
  rows,
  track,
} from "./helpers";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const FACETS = {
  ...emptyFacets(),
  repo: { "acme/sync": 7, "acme/web": 3 },
  stage: { built: 8, proven: 2 },
  proof: { none: 6, fresh: 4 },
  flag: { thrashing: 2 },
  age: { today: 2, week: 5, older: 3 },
  hasEdits: { true: 8, false: 2 },
};
const at = () => ({ at: new Date().toISOString(), lastPassAt: new Date().toISOString() });
const page = (total: number, p = 1, size = 25) => ({
  page: p,
  pageSize: size,
  total,
  pages: Math.ceil(total / size),
});
type Api = ReturnType<typeof fakeApi>;
const calls = (api: Api): string[] => listCalls(api);
const last = (api: Api): URLSearchParams => new URLSearchParams((calls(api).at(-1) ?? "").split("?")[1]);
const settle = (api: Api, n: number) => vi.waitFor(() => expect(calls(api)).toHaveLength(n));

async function ready(over: Partial<TrackView> = {}, search = "", stored = "") {
  const items = [item({ id: "a", title: "Alpha" }), item({ id: "b", title: "Beta" })];
  const api = fakeApi({ track: () => ({ body: track(items, { facets: FACETS, page: page(60), ...over }) }) });
  const root = renderApp(search, stored);
  await vi.waitFor(() => expect(rows(root).length).toBeGreaterThan(0));
  return { api, root };
}

/** The rows only: the overview above them repeats titles on purpose. */
const listText = (root: ParentNode): string =>
  [...root.querySelectorAll("section[aria-label]:not([aria-label='Overview']) ul")]
    .map((u) => u.textContent)
    .join(" ");
const buttonText = (root: ParentNode, text: string): HTMLButtonElement => {
  const b = [...root.querySelectorAll("button")].find((x) =>
    x.textContent?.replace(/\s+/g, " ").trim().startsWith(text),
  );
  if (!b) throw new Error(`no button "${text}"`);
  return b;
};
const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  flushSync();
};
function choose(el: HTMLSelectElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  flushSync();
}
const select = (root: ParentNode, label: string): HTMLSelectElement => {
  const l = [...root.querySelectorAll("label")].find((x) => x.textContent?.includes(label));
  const s = l?.querySelector("select");
  if (!s) throw new Error(`no select "${label}"`);
  return s;
};
const search = (root: ParentNode): HTMLInputElement => {
  const i = root.querySelector<HTMLInputElement>("input[type='search']");
  if (!i) throw new Error("no search box");
  return i;
};
const type = (box: HTMLInputElement, text: string): void => {
  box.value = text;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  flushSync();
};

describe("the request is built from the view state", () => {
  it("asks for the default view with every parameter spelled out, token in the header only", async () => {
    const { api } = await ready();
    const url = listCalls(api)[0];
    expect(url).toBe("/api/track?since=7d&sort=activity&order=desc&group=repo&pageSize=25");
    for (const [u, init] of api.mock.calls) {
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${TOKEN}`);
      expect(u).not.toContain(TOKEN);
    }
  });

  it("the header asks the same filters grouped by attention, one row, for its counts", async () => {
    const { api } = await ready({}, "?repo=acme%2Fsync&since=30d");
    const asked = api.mock.calls
      .map(([u]) => u)
      .filter((u) => u.includes("pageSize=30&") || u.endsWith("pageSize=30"));
    const p = new URLSearchParams((asked[0] ?? "").split("?")[1]);
    expect([p.get("group"), p.get("pageSize"), p.get("repo"), p.get("since")]).toEqual([
      "attention",
      "30",
      "acme/sync",
      "30d",
    ]);
  });

  it("starts from the URL and sends exactly that", async () => {
    const { api } = await ready(
      {},
      "?repo=acme%2Fsync,acme%2Fweb&stage=built&sort=title&group=repo&page=2&pageSize=50&hasEdits=true&since=30d&q=retry",
    );
    const p = last(api);
    expect(p.get("repo")).toBe("acme/sync,acme/web");
    expect([
      p.get("stage"),
      p.get("sort"),
      p.get("order"),
      p.get("group"),
      p.get("page"),
      p.get("pageSize"),
      p.get("hasEdits"),
      p.get("since"),
      p.get("q"),
    ]).toEqual(["built", "title", "asc", "repo", "2", "50", "true", "30d", "retry"]);
  });

  it("each control changes the request and the URL", async () => {
    const { api, root } = await ready();
    let n = calls(api).length;

    choose(select(root, "Sort by"), "title");
    await settle(api, ++n);
    expect([last(api).get("sort"), last(api).get("order")]).toEqual(["title", "asc"]);

    click(root.querySelector("button[aria-label^='Ascending']")!);
    await settle(api, ++n);
    expect(last(api).get("order")).toBe("desc");

    choose(select(root, "Group by"), "stage");
    await settle(api, ++n);
    expect(last(api).get("group")).toBe("stage");

    click(buttonText(root, "30 days"));
    await settle(api, ++n);
    expect(last(api).get("since")).toBe("30d");

    click(buttonText(root, "Has code edits"));
    await settle(api, ++n);
    expect(last(api).get("hasEdits")).toBe("true");

    click(buttonText(root, "acme/sync"));
    await settle(api, ++n);
    expect(last(api).get("repo")).toBe("acme/sync");
    click(buttonText(root, "acme/web"));
    await settle(api, ++n);
    expect(last(api).get("repo")).toBe("acme/sync,acme/web");
    click(buttonText(root, "built"));
    await settle(api, ++n);
    expect(last(api).get("stage")).toBe("built");
    click(buttonText(root, "none"));
    await settle(api, ++n);
    expect(last(api).get("proof")).toBe("none");
    click(buttonText(root, "thrashing"));
    await settle(api, ++n);
    expect(last(api).get("flag")).toBe("thrashing");

    choose(select(root, "Per page"), "50");
    await settle(api, ++n);
    expect(last(api).get("pageSize")).toBe("50");

    expect(new URLSearchParams(window.location.search).get("hasEdits")).toBe("true");
    expect(new URLSearchParams(window.location.search).get("flag")).toBe("thrashing");
  });

  it("chips show the live counts from facets", async () => {
    const { root } = await ready();
    expect(buttonText(root, "Has code edits").textContent).toContain("8");
    expect(buttonText(root, "acme/sync").textContent).toContain("7");
    expect(buttonText(root, "7 days").textContent).toContain("7");
  });

  it("a changed filter returns to page 1", async () => {
    const { api, root } = await ready({}, "?page=2");
    expect(last(api).get("page")).toBe("2");
    click(buttonText(root, "acme/web"));
    await vi.waitFor(() => expect(last(api).get("page")).toBeNull());
    expect(window.location.search).not.toContain("page=");
  });
});

describe("search", () => {
  beforeEach(() =>
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] }),
  );

  it("waits for a pause before asking, then sends q and replaces rather than adds history", async () => {
    const { api, root } = await ready();
    const before = calls(api).length;
    const len = history.length;
    for (const text of ["r", "re", "retry"]) {
      type(search(root), text);
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(calls(api)).toHaveLength(before);
    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(() => expect(calls(api)).toHaveLength(before + 1));
    expect(last(api).get("q")).toBe("retry");
    expect(window.location.search).toBe("?q=retry");
    expect(history.length).toBe(len);
  });

  it("Enter searches at once and the box is capped at 80 characters", async () => {
    const { api, root } = await ready();
    const before = calls(api).length;
    const box = search(root);
    expect(box.maxLength).toBe(80);
    type(box, "now");
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await vi.waitFor(() => expect(calls(api)).toHaveLength(before + 1));
    expect(last(api).get("q")).toBe("now");
  });
});

describe("pagination", () => {
  it("says which rows are shown and disables first and previous on page 1", async () => {
    const { root } = await ready();
    expect(root.querySelector("nav[aria-label='Pages']")?.textContent).toContain("1 to 25 of 60");
    expect(buttonText(root, "First").disabled).toBe(true);
    expect(buttonText(root, "Previous").disabled).toBe(true);
    expect(buttonText(root, "Next").disabled).toBe(false);
  });

  it("next, last, previous and first change the page in the request and the URL", async () => {
    // The fake daemon echoes the requested page, like the real one.
    const api = fakeApi({
      track: (u) => ({
        body: track([item({ id: "a" })], {
          facets: FACETS,
          page: page(312, Number(new URLSearchParams(u.split("?")[1]).get("page") ?? 1)),
        }),
      }),
    });
    const root = renderApp();
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
    let n = calls(api).length;
    click(buttonText(root, "Next"));
    await settle(api, ++n);
    expect(last(api).get("page")).toBe("2");
    expect(window.location.search).toBe("?page=2");
    await vi.waitFor(() => expect(root.textContent).toContain("Page 2 of"));
    click(buttonText(root, "Last"));
    await settle(api, ++n);
    expect(last(api).get("page")).toBe("13");
    await vi.waitFor(() => expect(root.textContent).toContain("Page 13 of"));
    click(buttonText(root, "Previous"));
    await settle(api, ++n);
    expect(last(api).get("page")).toBe("12");
    await vi.waitFor(() => expect(root.textContent).toContain("Page 12 of"));
    click(buttonText(root, "First"));
    await settle(api, ++n);
    expect(last(api).get("page")).toBeNull();
  });

  it("shows '26 to 50 of 312' on page 2", async () => {
    const { root } = await ready({ page: page(312, 2) }, "?page=2");
    expect(root.querySelector("nav")?.textContent).toContain("26 to 50 of 312");
  });

  it("a short last page reads '301 to 312 of 312' and disables next and last", async () => {
    const { root } = await ready({ page: page(312, 13) }, "?page=13");
    expect(root.querySelector("nav")?.textContent).toContain("301 to 312 of 312");
    expect(buttonText(root, "Next").disabled).toBe(true);
    expect(buttonText(root, "Last").disabled).toBe(true);
  });

  it("a page past the end lands on the last real page", async () => {
    const { api } = await ready({ page: page(60, 3) }, "?page=9");
    await vi.waitFor(() => expect(last(api).get("page")).toBe("3"));
    expect(window.location.search).toBe("?page=3");
  });

  it("an empty result has no page to turn", async () => {
    fakeApi({ track: () => ({ body: track([], { facets: FACETS }) }) });
    const root = renderApp("?repo=nope");
    await vi.waitFor(() => expect(root.textContent).toContain("Nothing matches"));
    expect(root.querySelector("nav[aria-label='Pages']")).toBeNull();
  });
});

describe("empty results", () => {
  it("names the filter that removed everything and how many items it hides", async () => {
    fakeApi({
      track: () => ({ body: track([], { facets: { ...FACETS, hasEdits: { true: 0, false: 0 } } }) }),
    });
    const root = renderApp("?repo=other&hasEdits=true");
    await vi.waitFor(() => expect(root.textContent).toContain("Nothing matches these filters."));
    const text = root.querySelector("section[aria-label='No results']")?.textContent ?? "";
    expect(text).toContain("The repo filter hides 10 items.");
    expect(text).not.toContain("has code edits filter hides");
  });

  it("Remove it relaxes just that filter, and Clear all filters keeps sort and group", async () => {
    const api = fakeApi({ track: () => ({ body: track([], { facets: FACETS }) }) });
    const root = renderApp("?repo=other&stage=built&sort=repo&group=stage");
    await vi.waitFor(() => expect(root.textContent).toContain("Nothing matches"));
    click(buttonText(root, "Remove it"));
    await vi.waitFor(() => expect(last(api).get("repo")).toBeNull());
    expect(last(api).get("stage")).toBe("built");
    click(buttonText(root, "Clear all filters"));
    await vi.waitFor(() => expect(last(api).get("stage")).toBeNull());
    expect([last(api).get("sort"), last(api).get("group")]).toEqual(["repo", "stage"]);
  });

  it("nothing in the last 7 days offers all time when older work exists", async () => {
    const api = fakeApi({
      track: () => ({
        body: track([], { facets: { ...emptyFacets(), age: { today: 0, week: 0, older: 4 } } }),
      }),
    });
    const root = renderApp();
    await vi.waitFor(() => expect(root.textContent).toContain("Nothing active in the last 7 days."));
    click(buttonText(root, "Remove it"));
    await vi.waitFor(() => expect(last(api).get("since")).toBe("all"));
  });

  it("with no work at all it invites the user to run vantage init", async () => {
    fakeApi({ track: () => ({ body: track([]) }) });
    const root = renderApp();
    await vi.waitFor(() => expect(root.textContent).toContain("vantage init"));
  });
});

describe("groups", () => {
  const flag = { kind: "thrashing", severity: "amber", reason: "Edited 9 times, no progress" };
  const long = new Date(Date.now() - 20 * 86_400_000).toISOString();
  // The daemon groups by attention and marks hasEdits; the page folds the quiet rows itself.
  const groups = [
    group("needs_you", "Needs you", [item({ id: "n1", title: "Needs one", flags: [flag] })], 12),
    group(
      "in_progress",
      "In progress",
      [
        item({ id: "c1", title: "Chat only", hasEdits: false }),
        item({ id: "o1", title: "Old work", lastActivity: long }),
        item({ id: "r1", title: "Regular work" }),
      ],
      20,
    ),
  ];
  const facets = { ...FACETS, hasEdits: { true: 8, false: 30 } };
  const opts = { groups, facets };

  it("headers are headings with totals; without-code and Older are built by the page and start collapsed", async () => {
    const { root } = await ready(opts, "?since=all");
    const heads = [...root.querySelectorAll("h2")].map((h) => h.textContent?.replace(/\s+/g, " ").trim());
    expect(heads).toEqual([
      "Needs you · 12 (1 on this page)",
      "In progress · 20 (1 on this page)",
      "Conversations without code · 30 (1 on this page)",
      "Older · 1",
    ]);
    expect(rows(root).map((r) => r.textContent)).toHaveLength(2);
    expect(listText(root)).not.toContain("Chat only");
    expect(listText(root)).not.toContain("Old work");
    expect(root.querySelectorAll("h2 button[aria-expanded='false']")).toHaveLength(2);
  });

  it("Older stays out of the 7-day view", async () => {
    const { root } = await ready(opts);
    const heads = [...root.querySelectorAll("h2")].map((h) => h.textContent ?? "");
    expect(heads.some((h) => h.includes("Older"))).toBe(false);
    expect(listText(root)).toContain("Old work");
  });

  it("a header opens and closes its group", async () => {
    const { root } = await ready(opts, "?since=all");
    click(buttonText(root, "Conversations without code"));
    expect(listText(root)).toContain("Chat only");
    click(buttonText(root, "Conversations without code"));
    expect(listText(root)).not.toContain("Chat only");
    click(buttonText(root, "Needs you"));
    expect(listText(root)).not.toContain("Needs one");
  });

  it("each flag shows its reason text", async () => {
    const { root } = await ready(opts);
    expect(root.textContent).toContain("Edited 9 times, no progress");
  });

  it("j skips rows of collapsed groups", async () => {
    const { root } = await ready(opts, "?since=all");
    press("j");
    press("j");
    expect(root.querySelector("li[aria-current='true']")?.textContent).toContain("Regular work");
    press("j");
    expect(root.querySelector("li[aria-current='true']")?.textContent).toContain("Regular work");
  });

  it("shows N sessions on a row only when the daemon sends more than one", async () => {
    const { root } = await ready({
      groups: [
        group("in_progress", "In progress", [
          item({ id: "s1", title: "Many", sessionCount: 3 }),
          item({ id: "s2", title: "One", sessionCount: 1 }),
          item({ id: "s3", title: "None" }),
        ]),
      ],
    });
    const text = rows(root).map((r) => r.textContent ?? "");
    expect(text[0]).toContain("3 sessions");
    expect(text[1]).not.toContain("session");
    expect(text[2]).not.toContain("session");
  });

  it("no heading is shown when grouping is off", async () => {
    const { root } = await ready(
      { groups: [group("all", "All", [item({ id: "z", title: "Zed" })])] },
      "?group=none",
    );
    expect(root.querySelector("h2")).toBeNull();
    expect(root.textContent).toContain("Zed");
  });
});

describe("keyboard additions", () => {
  it("/ focuses the search box without typing a slash into it", async () => {
    const { root } = await ready();
    const ev = new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(search(root));
  });

  it("keys typed in the search box do not trigger shortcuts, and Esc leaves the box", async () => {
    const { api, root } = await ready();
    const n = calls(api).length;
    const box = search(root);
    box.focus();
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "]", bubbles: true }));
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true }));
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(calls(api)).toHaveLength(n);
    expect(document.activeElement).not.toBe(box);
  });

  it("[ on page 1 does nothing and ] turns to page 2", async () => {
    const { api } = await ready({ page: page(60) });
    let n = calls(api).length;
    press("[");
    expect(calls(api)).toHaveLength(n);
    press("]");
    await settle(api, ++n);
    expect(last(api).get("page")).toBe("2");
  });

  it("] on the last page does nothing", async () => {
    const { api } = await ready({ page: page(60, 3) }, "?page=3");
    const n = calls(api).length;
    press("]");
    expect(calls(api)).toHaveLength(n);
  });

  it("1, 2, 3 and 4 group by attention, repo, stage and none", async () => {
    const { api } = await ready();
    let n = calls(api).length;
    for (const [key, g] of [
      ["3", "stage"],
      ["4", "none"],
      ["1", "attention"],
      ["2", "repo"],
    ] as const) {
      press(key);
      await settle(api, ++n);
      expect(last(api).get("group")).toBe(g);
    }
    press("2");
    expect(calls(api)).toHaveLength(n);
  });

  it("the keyboard map lists the new keys", async () => {
    const { root } = await ready();
    press("?");
    const map = root.querySelector("[aria-label='Keyboard map']")?.textContent ?? "";
    for (const k of ["/", "[", "]", "1"]) expect(map).toContain(k);
  });
});

describe("URL, history and the token", () => {
  it("back restores the previous view and asks for it", async () => {
    const { api, root } = await ready();
    click(buttonText(root, "acme/web"));
    await vi.waitFor(() => expect(last(api).get("repo")).toBe("acme/web"));
    window.history.replaceState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await vi.waitFor(() => expect(last(api).get("repo")).toBeNull());
  });

  it("remembers the last view and restores it when the URL has none", async () => {
    const { api } = await ready({}, "", "stage=proven&sort=title");
    expect(last(api).get("stage")).toBe("proven");
    expect(window.location.search).toBe("?stage=proven&sort=title");
  });

  it("the URL's view wins over the remembered one", async () => {
    const { api } = await ready({}, "?stage=built", "stage=proven");
    expect(last(api).get("stage")).toBe("built");
  });

  it("the token never reaches the query string, history, localStorage or any request URL", async () => {
    const api = fakeApi({
      track: () => ({ body: track([item({ id: "a" })], { facets: FACETS, page: page(60) }) }),
    });
    vi.stubGlobal("WebSocket", FakeSocket);
    sessionStorage.clear();
    window.history.replaceState(null, "", `/#token=${TOKEN}`);
    const push = vi.spyOn(history, "pushState");
    const replace = vi.spyOn(history, "replaceState");
    const root = render(App as Component<Record<string, never>>, {});
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));

    click(buttonText(root, "acme/web"));
    click(buttonText(root, "Next"));
    press("3");
    await vi.waitFor(() => expect(calls(api).length).toBeGreaterThan(3));

    expect(window.location.href).not.toContain(TOKEN);
    expect(window.location.hash).toBe("");
    for (const [, , url] of [...push.mock.calls, ...replace.mock.calls])
      expect(String(url ?? "")).not.toContain(TOKEN);
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain(TOKEN);
    expect(localStorage.getItem("vantage.view")).toBeTruthy();
    for (const u of calls(api)) expect(u).not.toContain(TOKEN);
    expect(sessionStorage.getItem("vantage.token")).toBe(TOKEN);
  });
});

describe("loading keeps the previous rows", () => {
  it("shows the old rows, busy, until the new response lands", async () => {
    let release: (() => void) | null = null;
    let slow = false;
    const api = fakeApi({
      track: () => ({
        body: track([item({ id: "a", title: "Old row" })], { facets: FACETS, page: page(60) }),
      }),
    });
    const real = globalThis.fetch;
    vi.stubGlobal("fetch", async (u: string, init?: RequestInit) => {
      if (!slow) return real(u, init);
      await new Promise<void>((r) => (release = r));
      return new Response(
        JSON.stringify(track([item({ id: "b", title: "New row" })], { facets: FACETS, page: page(60) })),
        { status: 200 },
      );
    });
    const root = renderApp();
    await vi.waitFor(() => expect(root.textContent).toContain("Old row"));
    slow = true;
    click(buttonText(root, "Next"));
    await vi.waitFor(() => expect(release).not.toBeNull());
    expect(root.textContent).toContain("Old row");
    expect(root.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(root.querySelector("ul[aria-label='Loading']")).toBeNull();
    release!();
    await vi.waitFor(() => expect(root.textContent).toContain("New row"));
    expect(root.querySelector("[aria-busy='true']")).toBeNull();
    expect(api).toHaveBeenCalled();
  });
});

describe("live pushes keep the page the user is on", () => {
  it("updates a visible row in place, ignores rows from other pages, then refreshes only the counts", async () => {
    const { api, root } = await ready({ page: page(60, 2) }, "?page=2");
    const sock = FakeSocket.all[0];
    if (!sock) throw new Error("no socket");
    sock.open();
    await vi.waitFor(() => expect(calls(api).length).toBeGreaterThan(1));
    await new Promise((r) => setTimeout(r, 30)); // let the refetch on open land before pushing
    api.mockClear();

    sock.push({ ...at(), type: "item.changed", id: "a", isNew: false, fields: { title: "Alpha renamed" } });
    sock.push({
      ...at(),
      type: "item.changed",
      id: "elsewhere",
      isNew: true,
      fields: { title: "Brand new", stage: "asked", flags: [] },
    });
    flushSync();
    expect(root.textContent).toContain("Alpha renamed");
    expect(root.textContent).not.toContain("Brand new");
    expect(rows(root)).toHaveLength(2);

    // One throttled refetch for the counts; the rows stay as they were.
    await vi.waitFor(() => expect(calls(api)).toHaveLength(1), { timeout: 3000 });
    expect(last(api).get("page")).toBe("2");
    expect(root.textContent).toContain("Alpha renamed");
    expect(root.textContent).not.toContain("Brand new");
  });
});
