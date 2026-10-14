// Live updates (docs/specs/web-ui.md#api-daemon-to-ui, D81). The daemon pushes what changed; the page
// applies it to the data it already has, and falls back to polling while the socket is down.
import { STALE_PASS_MS, type SourceHealth, type TrackItem } from "@vantage/core/track";
import { takeToken } from "./api";
import type { TrackRow, TrackView } from "./contract";

export const LIVE_PROTOCOL = "vantage.v1";
export const BACKOFF_START_MS = 1000;
export const BACKOFF_MAX_MS = 30_000;

export type LivePush = { at: string; lastPassAt: string | null } & (
  | { type: "item.changed"; id: string; isNew: boolean; fields: Partial<Omit<TrackItem, "id">> }
  | { type: "flag.raised"; itemId: string; kind: string; severity: string }
  | { type: "source.health"; sources: SourceHealth[] }
  | { type: "resync" }
);

/** Parses one frame; anything that isn't a known push is ignored, never trusted. */
export function parsePush(text: string): LivePush | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null) return null;
  const type: unknown = Reflect.get(v, "type");
  const at: unknown = Reflect.get(v, "at");
  const pass: unknown = Reflect.get(v, "lastPassAt");
  if (typeof at !== "string") return null;
  const env = { at, lastPassAt: typeof pass === "string" ? pass : null };
  const id: unknown = Reflect.get(v, "id");
  const fields: unknown = Reflect.get(v, "fields");
  const sources: unknown = Reflect.get(v, "sources");
  const itemId: unknown = Reflect.get(v, "itemId");
  const kind: unknown = Reflect.get(v, "kind");
  const severity: unknown = Reflect.get(v, "severity");
  switch (type) {
    case "item.changed":
      return typeof id === "string" && typeof fields === "object" && fields !== null
        ? {
            ...env,
            type,
            id,
            isNew: Reflect.get(v, "isNew") === true,
            fields: Object.fromEntries(Object.entries(fields)),
          }
        : null;
    case "source.health":
      return Array.isArray(sources) ? { ...env, type, sources: sources.map((s: SourceHealth) => s) } : null;
    case "flag.raised":
      return typeof itemId === "string" && typeof kind === "string" && typeof severity === "string"
        ? { ...env, type, itemId, kind, severity }
        : null;
    case "resync":
      return { ...env, type };
    default:
      return null;
  }
}

/** What the page must do after a push: nothing more, refresh only the counts, or refetch the page. */
export type Refresh = "none" | "facets" | "full";

/**
 * Applies a push to the page the user is looking at. Rows already on the page are updated in place and
 * never move, appear or disappear (the page does not change under the reader); anything else only marks
 * the counts stale so the page can refresh facets, totals and group totals. A `resync` refetches.
 */
export function applyPush(data: TrackView, push: LivePush): { view: TrackView; refresh: Refresh } {
  if (push.type === "resync") return { view: data, refresh: "full" };
  const lastPassAt = push.lastPassAt ?? data.lastPassAt;
  const base: TrackView = {
    ...data,
    generatedAt: push.at,
    lastPassAt,
    stale: lastPassAt !== null && Date.parse(push.at) - Date.parse(lastPassAt) > STALE_PASS_MS,
  };
  if (push.type === "source.health") return { view: { ...base, sources: push.sources }, refresh: "none" };
  if (push.type === "flag.raised") return { view: base, refresh: "facets" };
  const groups = data.groups.map((g) => ({
    ...g,
    items: g.items.map((i): TrackRow => (i.id === push.id ? { ...i, ...push.fields, id: i.id } : i)),
  }));
  return { view: { ...base, groups }, refresh: "facets" };
}

/** Takes only the counts (facets, totals) from a refetch and keeps the rows the reader is looking at. */
export function mergeCounts(shown: TrackView, fresh: TrackView): TrackView {
  const totals = new Map(fresh.groups.map((g) => [g.id, g.total]));
  return {
    ...shown,
    facets: fresh.facets,
    page: { ...shown.page, total: fresh.page.total, pages: fresh.page.pages },
    groups: shown.groups.map((g) => ({ ...g, total: totals.get(g.id) ?? g.total })),
  };
}

export interface LiveHandlers {
  /** Fires on every (re)connect: the page refetches so nothing between disconnect and connect is lost. */
  onOpen(): void;
  onPush(push: LivePush): void;
  /** Fires when the socket drops or fails to open; the page polls until `onOpen` fires again. */
  onDown(): void;
}

/** Next reconnect delay: doubles from 1 s to a 30 s cap. */
export const nextBackoff = (ms: number): number => Math.min(BACKOFF_MAX_MS, ms * 2);

export function startLive(h: LiveHandlers, url = `ws://${window.location.host}/api/live`): () => void {
  let ws: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let delay = BACKOFF_START_MS;
  let stopped = false;
  const connect = (): void => {
    timer = null;
    const token = takeToken();
    if (!token || stopped) return;
    const sock = new WebSocket(url, [LIVE_PROTOCOL, token]);
    ws = sock;
    sock.addEventListener("open", () => {
      delay = BACKOFF_START_MS;
      h.onOpen();
    });
    sock.addEventListener("message", (e) => {
      const p = typeof e.data === "string" ? parsePush(e.data) : null;
      if (p) h.onPush(p);
    });
    sock.addEventListener("close", () => {
      if (ws !== sock) return;
      ws = null;
      h.onDown();
      if (!stopped) {
        timer = setTimeout(connect, delay);
        delay = nextBackoff(delay);
      }
    });
  };
  connect();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    ws?.close();
  };
}
