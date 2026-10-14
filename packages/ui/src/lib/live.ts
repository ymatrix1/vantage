// Live updates (docs/specs/web-ui.md#api-daemon-to-ui, D81). The daemon pushes what changed; the page
// applies it to the data it already has, and falls back to polling while the socket is down.
import {
  ATTENTION_LABEL,
  ATTENTION_ORDER,
  STALE_PASS_MS,
  attentionOf,
  type SourceHealth,
  type TrackItem,
  type TrackResponse,
} from "@vantage/core/track";
import { takeToken } from "./api";

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

function regroup(items: TrackItem[]): TrackResponse["groups"] {
  return ATTENTION_ORDER.map((attention) => ({
    attention,
    label: ATTENTION_LABEL[attention],
    items: items.filter((i) => attentionOf(i) === attention),
  }));
}

/**
 * Returns the next view, or null when the page should refetch (a `resync`, or a change to an item it
 * has never seen without its full fields). `flag.raised` only announces; the flag arrives in `item.changed`.
 */
export function applyPush(data: TrackResponse, push: LivePush): TrackResponse | null {
  if (push.type === "resync") return null;
  const lastPassAt = push.lastPassAt ?? data.lastPassAt;
  const base = {
    ...data,
    generatedAt: push.at,
    lastPassAt,
    stale: lastPassAt !== null && Date.parse(push.at) - Date.parse(lastPassAt) > STALE_PASS_MS,
  };
  if (push.type === "flag.raised") return base;
  if (push.type === "source.health") return { ...base, sources: push.sources };
  const items = data.groups.flatMap((g) => g.items);
  const at = items.findIndex((i) => i.id === push.id);
  if (at < 0) {
    if (!push.isNew) return null;
    const f = push.fields;
    if (f.title === undefined || f.stage === undefined || f.flags === undefined) return null;
    const item: TrackItem = {
      id: push.id,
      title: f.title,
      repo: f.repo ?? null,
      stage: f.stage,
      proofStatus: f.proofStatus ?? "none",
      proofLevel: f.proofLevel ?? 0,
      docsOnly: f.docsOnly ?? false,
      flags: f.flags,
      lastActivity: f.lastActivity ?? push.at,
    };
    return { ...base, groups: regroup([...items, item]) };
  }
  const prev = items[at];
  if (!prev) return null;
  items[at] = { ...prev, ...push.fields, id: prev.id };
  return { ...base, groups: regroup(items) };
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
