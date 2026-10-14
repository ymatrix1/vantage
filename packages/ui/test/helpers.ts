// Synthetic data and a faked fetch for the component tests. Nothing here is real user data.
import { flushSync, mount, unmount } from "svelte";
import type { Component } from "svelte";
import { vi } from "vitest";
import type { TraceResponse, TrackItem, TrackResponse } from "@vantage/core/track";
import App from "../src/App.svelte";

export const TOKEN = "0123456789abcdef0123456789abcdef";

export function item(over: Partial<TrackItem> = {}): TrackItem {
  return {
    id: "wi-1",
    title: "Add retry to sync",
    repo: "acme/sync",
    stage: "built",
    proofStatus: "none",
    proofLevel: 0,
    docsOnly: false,
    flags: [],
    lastActivity: new Date().toISOString(),
    ...over,
  };
}

export function track(items: TrackItem[], over: Partial<TrackResponse> = {}): TrackResponse {
  return {
    generatedAt: new Date().toISOString(),
    lastPassAt: new Date().toISOString(),
    stale: false,
    groups: [{ attention: "in_progress", label: "In progress", items }],
    sources: [
      { source: "agent", state: "ok", events: 3, lastEventAt: null },
      { source: "git", state: "ok", events: 2, lastEventAt: null },
    ],
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
      },
    ],
    ...over,
  };
}

type Reply = { status?: number; body?: unknown } | "network-error";

/** Routes /api/track and /api/items/<id>/trace; the reply for each can change between calls. */
export function fakeApi(routes: { track: () => Reply; trace?: (id: string) => Reply }) {
  const fn = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async (input) => {
    const url = input;
    const m = /^\/api\/items\/(.+)\/trace$/.exec(url);
    const reply = m?.[1]
      ? (routes.trace ?? ((): Reply => ({ status: 404 })))(decodeURIComponent(m[1]))
      : routes.track();
    if (reply === "network-error") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

let mounted: ReturnType<typeof mount> | null = null;

export function render<P extends Record<string, unknown>>(component: Component<P>, props: P) {
  document.body.innerHTML = "";
  const target = document.body.appendChild(document.createElement("div"));
  mounted = mount(component, { target, props });
  flushSync();
  return target;
}

export function renderApp() {
  sessionStorage.setItem("vantage.token", TOKEN);
  return render(App as Component<Record<string, never>>, {});
}

export function cleanup(): void {
  if (mounted) void unmount(mounted);
  mounted = null;
  document.body.innerHTML = "";
  sessionStorage.clear();
  vi.unstubAllGlobals();
}

export function press(key: string, init: KeyboardEventInit = {}): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  flushSync();
}

export const rows = (root: ParentNode): HTMLButtonElement[] => [
  ...root.querySelectorAll<HTMLButtonElement>("button[id^='row-']"),
];
