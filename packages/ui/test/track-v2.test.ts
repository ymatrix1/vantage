// Synthetic data only. Track v2: the one-line header, project sections, readable rows, inline detail and
// the pager at both ends of the list.
import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ItemDetailView } from "@vantage/core/track";
import type { TrackView } from "../src/lib/contract";
import {
  cleanup,
  emptyFacets,
  fakeApi,
  group,
  item,
  listCalls,
  press,
  renderApp,
  rows,
  track,
  traceOf,
} from "./helpers";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const flag = {
  kind: "unproven_claim",
  severity: "amber",
  reason: "Said done, no test ran after the last edit",
};
const WEB = "github.com/acme/web";
const items = [
  item({
    id: "a",
    title: "web · main · Oct 14",
    repo: WEB,
    branch: "claude/retry-0a1b2c",
    flags: [flag],
    sessionCount: 3,
  }),
  item({ id: "b", title: "Add pager", repo: WEB, branch: "feat/pager" }),
  item({ id: "c", title: "Fix api", repo: "github.com/acme/api", branch: "fix/api" }),
  item({ id: "d", title: "No remote work", repo: "scratch-folder", branch: "main" }),
];
const groups = [
  group("repo:github.com/acme/api", "github.com/acme/api", [items[2]], 7),
  group(`repo:${WEB}`, WEB, [items[0], items[1]], 5),
  group("repo:scratch-folder", "scratch-folder", [items[3]], 1),
];
const facets = {
  ...emptyFacets(),
  flag: { unproven_claim: 12, thrashing: 5, none: 98 },
  age: { today: 1, week: 2, older: 37 },
};
const summaryBody = (): TrackView =>
  track([], {
    groups: [group("needs_you", "Needs you", [], 20), group("in_progress", "In progress", [], 98)],
    facets,
  });
const detail = (id: string, over: Partial<ItemDetailView> = {}): ItemDetailView => ({
  id,
  repo: WEB,
  repos: [WEB],
  repoUrl: `https://${WEB}`,
  branch: "claude/retry-0a1b2c",
  worktreePath: "C:\\work\\brave-joliot-995ebc",
  lastCommitSha: "deadbeef1234",
  sessions: [
    {
      id: "s1111111-aaaa",
      parentId: null,
      firstAt: "2026-01-05T09:00:00Z",
      lastAt: "2026-01-05T09:30:00Z",
      events: 12,
    },
    {
      id: "s2222222-bbbb",
      parentId: "s1111111-aaaa",
      firstAt: "2026-01-05T09:40:00Z",
      lastAt: "2026-01-05T09:50:00Z",
      events: 4,
    },
  ],
  files: { names: ["App.svelte", "util.ts", "a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"], total: 12 },
  ...over,
});

async function ready(
  opts: {
    detail?: (id: string) => { status?: number; body?: unknown };
    trace?: (id: string) => { status?: number; body?: unknown };
  } = {},
) {
  const api = fakeApi({
    track: (u) => ({
      body: /[?&]pageSize=30(&|$)/.test(u)
        ? summaryBody()
        : track([], { groups, facets, page: { page: 1, pageSize: 25, total: 60, pages: 3 } }),
    }),
    trace: opts.trace ?? ((id) => ({ body: traceOf(id) })),
    detail: opts.detail ?? ((id) => ({ body: detail(id) })),
  });
  const root = renderApp();
  await vi.waitFor(() => expect(rows(root).length).toBeGreaterThan(0));
  return { api, root };
}

const click = (el: Element | null | undefined): void => {
  if (!el) throw new Error("nothing to click");
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  flushSync();
};
const buttonText = (root: ParentNode, text: string): HTMLButtonElement => {
  const b = [...root.querySelectorAll("button")].find((x) =>
    x.textContent?.replace(/\s+/g, " ").trim().startsWith(text),
  );
  if (!b) throw new Error(`no button "${text}"`);
  return b;
};
const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

describe("L0 header", () => {
  it("one line of counts for the current filters, with the flags that exist", async () => {
    const { root } = await ready();
    await vi.waitFor(() =>
      expect(squash(root.querySelector("[aria-label='Summary']")?.textContent)).toContain("98 in progress"),
    );
    const text = squash(root.querySelector("[aria-label='Summary']")?.textContent);
    expect(text).toContain("Last 7 days:");
    expect(text).toContain("98 in progress, 20 need you (12 unproven, 5 stuck), 37 older");
  });

  it("each number filters when clicked", async () => {
    const { api, root } = await ready();
    await vi.waitFor(() => expect(root.textContent).toContain("98 in progress"));
    const last = () => new URLSearchParams((listCalls(api).at(-1) ?? "").split("?")[1]);
    click(buttonText(root, "98 in progress"));
    await vi.waitFor(() => expect(last().get("flag")).toBe("none"));
    click(buttonText(root, "20 need you"));
    await vi.waitFor(() => expect(last().get("flag")).toBe("thrashing,unproven_claim"));
    click(buttonText(root, "37 older"));
    await vi.waitFor(() => expect(last().get("since")).toBe("all"));
  });

  it("shows Offline when the daemon cannot be reached, and Stale when rows lag", async () => {
    fakeApi({ track: () => "network-error" });
    const off = renderApp();
    await vi.waitFor(() =>
      expect(off.querySelector("[aria-label='Summary']")?.textContent).toContain("Offline"),
    );
    cleanup();
    fakeApi({
      track: () => ({
        body: track([item()], { stale: true, lastPassAt: new Date(Date.now() - 20 * 60_000).toISOString() }),
      }),
    });
    const stale = renderApp();
    await vi.waitFor(() =>
      expect(stale.querySelector("[aria-label='Summary']")?.textContent).toContain("Stale"),
    );
  });
});

describe("L1 projects", () => {
  it("are headings ordered by who needs you most, with counts and a repo link", async () => {
    const { root } = await ready();
    const heads = [...root.querySelectorAll("h2")].map((h) => squash(h.textContent));
    expect(heads).toEqual([
      "acme/web · 5 (2 on this page)",
      "acme/api · 7 (1 on this page)",
      "scratch-folder · 1",
    ]);
    const web = root.querySelector("section[aria-label='acme/web']");
    expect(squash(web?.textContent)).toContain("1 need you, 1 in progress");
    const link = web?.querySelector<HTMLAnchorElement>("a[href='https://github.com/acme/web']");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(root.querySelector("section[aria-label='scratch-folder'] a[href]")).toBeNull();
  });

  it("each project collapses", async () => {
    const { root } = await ready();
    click(buttonText(root, "acme/api"));
    expect(root.textContent).not.toContain("Fix api");
    click(buttonText(root, "acme/api"));
    expect(root.textContent).toContain("Fix api");
  });
});

describe("L2 rows", () => {
  it("titles with the most human name and subtitles with branch and time, never a worktree folder", async () => {
    const wt = item({
      id: "worktree:C:/w/brave-joliot-995ebc",
      title: "brave-joliot-995ebc",
      repo: "scratch-folder",
      branch: "docs/agents-compact",
    });
    fakeApi({
      track: () => ({
        body: track([wt], { groups: [group("repo:scratch-folder", "scratch-folder", [wt])], facets }),
      }),
    });
    const root = renderApp();
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
    const row = squash(rows(root)[0]?.textContent);
    expect(row).toContain("docs/agents-compact");
    expect(row).not.toContain("brave-joliot");
    expect(row).toMatch(/docs\/agents-compact · \d+ (min|h|d) ago|docs\/agents-compact · just now/);
  });

  it("shows a chip per repo when an item touches several, and lists them in the detail (D190)", async () => {
    const m = item({
      id: "m",
      title: "Cross-repo change",
      repo: "github.com/acme/web",
      repos: ["github.com/acme/web", "github.com/acme/api"],
      branch: "feat/both",
    });
    fakeApi({
      track: () => ({
        body: track([m], { groups: [group("repo:github.com/acme/web", "acme/web", [m])], facets }),
      }),
      detail: () => ({
        body: detail("m", { repos: ["github.com/acme/web", "github.com/acme/api"] }),
      }),
    });
    const root = renderApp();
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
    const chips = [...(rows(root)[0]?.querySelectorAll("span[title^='github.com/']") ?? [])].map(
      (c) => c.textContent,
    );
    expect(chips).toEqual(["acme/web", "acme/api"]);
    click(rows(root)[0]);
    await vi.waitFor(() => expect(root.textContent).toContain("Repos:"));
    expect(root.querySelectorAll("[aria-label='Details'] a[title^='github.com/']")).toHaveLength(2);
  });

  it("shows the organization before the branch, 'Local' for a repo with no remote, and offers an Organization filter (D130)", async () => {
    const a = item({ id: "a", repo: "github.com/Flip-to/app", org: "Flip-to", branch: "feat/a" });
    const b = item({ id: "b", repo: "scratch", org: "local", branch: "feat/b" });
    fakeApi({
      track: () => ({
        body: track([a, b], {
          groups: [group("repo:x", "x", [a, b])],
          facets: { ...facets, org: { "Flip-to": 1, local: 1 } },
        }),
      }),
    });
    const root = renderApp();
    await vi.waitFor(() => expect(rows(root)).toHaveLength(2));
    expect(squash(rows(root)[0]?.textContent)).toMatch(/^.*Flip-to · feat\/a/);
    expect(squash(rows(root)[1]?.textContent)).toContain("Local · feat/b");
    expect(root.querySelector("ul[aria-label='Organization filter']")?.textContent).toContain("Flip-to");
  });

  it("a fallback title becomes the cleaned branch; a flagged row says why in words; a session chip counts", async () => {
    const { root } = await ready();
    const row = squash(rows(root).find((r) => r.textContent?.includes("claude/retry-0a1b2c"))?.textContent);
    expect(row).toContain("retry");
    expect(row).not.toContain("web · main · Oct 14");
    expect(row).toContain("Said done, no test ran after the last edit");
    expect(row).toContain("3 sessions");
    expect(row).toContain("Built · no proof yet");
  });

  it("has a branch link built from the remote, escaped, and none without a remote", async () => {
    const { root } = await ready();
    const a = root.querySelector<HTMLAnchorElement>(
      "a[href='https://github.com/acme/web/tree/claude/retry-0a1b2c']",
    );
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("aria-label")).toBeTruthy();
    // The link is a sibling of the row button, never inside it.
    expect(a?.closest("button")).toBeNull();
    const scratch = root.querySelector("section[aria-label='scratch-folder'] li");
    expect(scratch?.querySelector("a")).toBeNull();
  });
});

describe("L3 inline detail", () => {
  it("opens on click and Enter, shows sessions nested, files by base name and where it lives", async () => {
    const { root } = await ready();
    const first = rows(root).find((r) => r.textContent?.includes("retry"));
    click(first);
    await vi.waitFor(() => expect(root.textContent).toContain("Sessions · 2"));
    const text = squash(root.querySelector("[aria-label='Details']")?.textContent);
    expect(text).toContain("Why it needs you");
    expect(text).toContain("Said done, no test ran after the last edit");
    expect(text).toContain("Session s1111111");
    expect(text).toContain("continues above: Session s2222222");
    expect(text).toContain("Files touched · 12");
    expect(text).toContain("App.svelte, util.ts, a.ts, b.ts, c.ts, d.ts and 6 more");
    expect(text).toContain("Stage history");
    expect(text).toContain("Branch: claude/retry-0a1b2c");
    expect(text).toContain("Last commit: deadbeef12");
    expect(text).toContain("Folder: C:\\work\\brave-joliot-995ebc");
    click(first);
    expect(root.querySelector("[aria-label='Details']")).toBeNull();
  });

  it("Enter toggles the selected row and Esc closes every open row", async () => {
    const { root } = await ready();
    press("j");
    press("Enter");
    await vi.waitFor(() => expect(root.querySelector("[aria-label='Details']")).not.toBeNull());
    press("j");
    press("Enter");
    await vi.waitFor(() => expect(root.querySelectorAll("[aria-label='Details']")).toHaveLength(2));
    press("Escape");
    expect(root.querySelectorAll("[aria-label='Details']")).toHaveLength(0);
  });

  it("e opens every row of the selected project", async () => {
    const { api, root } = await ready();
    press("j"); // first row: in the first project (acme/web has two rows)
    press("e");
    await vi.waitFor(() => expect(root.querySelectorAll("[aria-label='Details']")).toHaveLength(2));
    const asked = api.mock.calls.map(([u]) => u).filter((u) => /^\/api\/items\/[^/]+$/.test(u));
    expect(asked.toSorted()).toEqual(["/api/items/a", "/api/items/b"]);
    expect(root.textContent).not.toContain("Sessions · 2Fix api");
  });

  it("links and copy actions come from the remote, the branch and the worktree", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { root } = await ready();
    click(rows(root).find((r) => r.textContent?.includes("retry")));
    await vi.waitFor(() => expect(root.textContent).toContain("Last commit: deadbeef12"));
    const panel = root.querySelector("[aria-label='Details']");
    const hrefs = [...(panel?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "https://github.com/acme/web", // the repo chip
      "https://github.com/acme/web/tree/claude/retry-0a1b2c",
      "https://github.com/acme/web/commit/deadbeef1234",
    ]);
    for (const a of panel?.querySelectorAll("a") ?? [])
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    click(buttonText(root, "Copy branch name"));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("claude/retry-0a1b2c"));
    click(buttonText(root, "Copy cd command"));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('cd "C:\\work\\brave-joliot-995ebc"'));
    await vi.waitFor(() => expect(squash(panel?.textContent)).toContain("cd command copied"));
  });

  it("says so when the detail cannot be loaded, and still shows the trace", async () => {
    const { root } = await ready({ detail: () => ({ status: 500 }) });
    click(rows(root)[0]);
    await vi.waitFor(() =>
      expect(root.textContent).toContain("Sessions and files are not available right now."),
    );
    await vi.waitFor(() => expect(root.textContent).toContain("Stage history"));
  });

  it("a failed trace marks only that row, never the whole page", async () => {
    const { root } = await ready({ trace: () => ({ status: 404 }) });
    click(rows(root)[0]);
    await vi.waitFor(() => expect(root.textContent).toContain("History is not available right now."));
    expect(root.querySelector("[role='alert']")).toBeNull();
    expect(root.querySelector("[aria-label='Summary']")?.textContent).not.toContain("Offline");
    expect(root.textContent).toContain("Sessions · 2");
  });

  it("offers no cd button for a path that needs shell escaping", async () => {
    const { root } = await ready({
      detail: (id) => ({ body: detail(id, { worktreePath: "/w/it's $HOME" }) }),
    });
    click(rows(root)[0]);
    await vi.waitFor(() => expect(root.textContent).toContain("Sessions · 2"));
    expect([...root.querySelectorAll("button")].some((b) => b.textContent?.includes("Copy cd command"))).toBe(
      false,
    );
  });

  it("renders every string in the detail as text", async () => {
    const IMG = `<img src=x onerror="window.pwned=1">`;
    const evil = detail("a", {
      repoUrl: "javascript:alert(1)",
      branch: IMG,
      worktreePath: `/w/${IMG}`,
      lastCommitSha: "not a sha",
      sessions: [{ id: IMG, parentId: null, firstAt: "", lastAt: "", events: 1 }],
      files: { names: [IMG, '<b id="injected">x</b>'], total: 2 },
    });
    const { root } = await ready({ detail: () => ({ body: evil }) });
    click(rows(root).find((r) => r.textContent?.includes("retry")));
    await vi.waitFor(() => expect(root.textContent).toContain("Files touched · 2"));
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector("#injected")).toBeNull();
    expect(Reflect.get(window, "pwned")).toBeUndefined();
    expect(root.textContent).toContain(IMG);
    for (const a of root.querySelectorAll("a"))
      expect(a.getAttribute("href")).toMatch(/^https:\/\/github\.com\/acme\//);
  });
});

describe("pager and toolbar", () => {
  it("shows the pager above and below the list, the page size once, and keeps the toolbar sticky", async () => {
    const { root } = await ready();
    const navs = [...root.querySelectorAll("nav")];
    expect(navs.map((n) => n.getAttribute("aria-label"))).toEqual(["Pages, top of list", "Pages"]);
    for (const n of navs) expect(squash(n.textContent)).toContain("1 to 25 of 60");
    expect(root.querySelectorAll("select").length).toBeGreaterThan(0);
    expect(navs[0]?.querySelector("select")).toBeNull();
    expect(navs[1]?.querySelector("select")).not.toBeNull();
    const sticky = root.querySelector("[data-testid='sticky-top']");
    expect(sticky?.classList.contains("md:sticky")).toBe(true);
    expect(sticky?.querySelector("input[type='search']")).not.toBeNull();
    expect(sticky?.querySelector("[aria-label='Summary']")).not.toBeNull();
  });

  it("[ and ] page, and the keyboard map names e", async () => {
    const { api, root } = await ready();
    press("]");
    await vi.waitFor(() =>
      expect(new URLSearchParams((listCalls(api).at(-1) ?? "").split("?")[1]).get("page")).toBe("2"),
    );
    press("?");
    expect(root.querySelector("[aria-label='Keyboard map']")?.textContent).toContain("open every row");
  });
});
