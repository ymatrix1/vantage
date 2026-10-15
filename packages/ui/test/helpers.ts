// Synthetic data and a faked fetch for the component tests. Nothing here is real user data.
import { flushSync, mount, unmount } from "svelte";
import type { Component } from "svelte";
import { vi } from "vitest";
import type { TraceResponse } from "@vantage/core/track";
import type { Facets, TrackGroup, TrackRow, TrackView } from "../src/lib/contract";
import App from "../src/App.svelte";

// Built, not written out, so secret scanners do not mistake the fake token for a key.
export const TOKEN = "ab".repeat(16);

export function item(over: Partial<TrackRow> = {}): TrackRow {
  return {
    id: "wi-1",
    title: "Add retry to sync",
    repo: "acme/sync",
    stage: "built",
    proofStatus: "none",
    proofLevel: 0,
    docsOnly: false,
    flags: [],
    hasEdits: true,
    lastActivity: new Date().toISOString(),
    ...over,
  };
}

export const emptyFacets = (): Facets => ({
  org: {},
  repo: {},
  branch: {},
  stage: {},
  proof: {},
  flag: {},
  age: { today: 0, week: 0, older: 0 },
  hasEdits: { true: 0, false: 0 },
});

export function group(id: string, label: string, items: TrackRow[], total = items.length): TrackGroup {
  return { id, label, total, items };
}

/** One "In progress" group by default; pass `groups` to build others and `page` to set paging. */
export function track(items: TrackRow[], over: Partial<TrackView> = {}): TrackView {
  return {
    generatedAt: new Date().toISOString(),
    lastPassAt: new Date().toISOString(),
    stale: false,
    groups: [group("in_progress", "In progress", items)],
    sources: [
      { source: "agent", state: "ok", events: 3, lastEventAt: null },
      { source: "git", state: "ok", events: 2, lastEventAt: null },
    ],
    page: { page: 1, pageSize: 25, total: items.length, pages: items.length === 0 ? 0 : 1 },
    facets: emptyFacets(),
    ...over,
  };
}

export function traceOf(id: string, over: Partial<TraceResponse> = {}): TraceResponse {
  return {
    id,
    events: [
      {
        eventId: 1,
        source: "git",
        kind: "commit",
        occurredAt: "2026-01-01T00:00:00Z",
        rule: "branch-name",
        undone: false,
      },
    ],
    transitions: [
      { from: null, to: "asked", at: "2026-01-01T00:00:00Z", eventId: 1, reason: "first prompt" },
    ],
    flags: [],
    proofs: [
      {
        eventId: 2,
        level: 2,
        state: "fresh",
        weakReason: null,
        command: "pnpm test",
        ranAt: "2026-01-01T00:00:00Z",
        type: "test",
        stale: false,
      },
    ],
    asked: {
      at: "2026-01-01T00:00:00Z",
      anchorKind: "branch",
      anchorValue: "feat/x",
      sessionId: "a1b2c3d4-e5f6-7890",
    },
    ...over,
  };
}

type Reply = { status?: number; body?: unknown } | "network-error";

const none = (): Reply => ({ status: 404 });

/**
 * Routes /api/track, /api/items/<id>/trace and /api/items/<id>; the reply for each can change between calls.
 * The page's header asks for `pageSize=1` (counts only): tests count list requests with `listCalls`.
 */
export function fakeApi(routes: {
  track: (url: string) => Reply;
  trace?: (id: string) => Reply;
  detail?: (id: string) => Reply;
}) {
  const fn = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async (input) => {
    const url = input;
    const t = /^\/api\/items\/(.+)\/trace$/.exec(url);
    const d = /^\/api\/items\/([^/]+)$/.exec(url);
    const reply = t?.[1]
      ? (routes.trace ?? none)(decodeURIComponent(t[1]))
      : d?.[1]
        ? (routes.detail ?? none)(decodeURIComponent(d[1]))
        : routes.track(url);
    if (reply === "network-error") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** The list requests (everything under /api/track except the header's one-row counts request). */
export const listCalls = (api: ReturnType<typeof fakeApi>): string[] =>
  api.mock.calls.map(([u]) => u).filter((u) => u.startsWith("/api/track") && !/[?&]pageSize=1(&|$)/.test(u));

/** Stands in for the browser WebSocket: the test decides when it opens, pushes and drops. */
export class FakeSocket extends EventTarget {
  static all: FakeSocket[] = [];
  readonly protocols: string[];
  constructor(
    readonly url: string,
    protocols: string[] = [],
  ) {
    super();
    this.protocols = protocols;
    FakeSocket.all.push(this);
  }
  close(): void {}
  open(): void {
    this.dispatchEvent(new Event("open"));
  }
  push(frame: unknown): void {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(frame) }));
  }
  drop(): void {
    this.dispatchEvent(new Event("close"));
  }
}

let mounted: ReturnType<typeof mount> | null = null;

export function render<P extends Record<string, unknown>>(component: Component<P>, props: P) {
  document.body.innerHTML = "";
  const target = document.body.appendChild(document.createElement("div"));
  mounted = mount(component, { target, props });
  flushSync();
  return target;
}

/** `search` is the page's query string (with `?`); `stored` is a remembered view (without it). */
export function renderApp(search = "", stored = "") {
  window.history.replaceState(null, "", `/${search}`);
  localStorage.clear();
  if (stored) localStorage.setItem("vantage.view", stored);
  FakeSocket.all = [];
  vi.stubGlobal("WebSocket", FakeSocket);
  sessionStorage.setItem("vantage.token", TOKEN);
  return render(App as Component<Record<string, never>>, {});
}

export function cleanup(): void {
  if (mounted) void unmount(mounted);
  mounted = null;
  document.body.innerHTML = "";
  sessionStorage.clear();
  localStorage.clear();
  vi.unstubAllGlobals();
}

export function press(key: string, init: KeyboardEventInit = {}): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  flushSync();
}

export const rows = (root: ParentNode): HTMLButtonElement[] => [
  ...root.querySelectorAll<HTMLButtonElement>("button[id^='row-']"),
];
