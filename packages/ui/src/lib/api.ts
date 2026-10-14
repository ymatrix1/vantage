// Daemon API client (docs/specs/web-ui.md#api-daemon-to-ui). The token arrives in the URL fragment on
// launch (D32), moves to sessionStorage and leaves the address bar; it is only ever sent as a header.
import type { TraceResponse, TrackResponse } from "@vantage/core/track";

const KEY = "vantage.token";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function takeToken(): string | null {
  const m = /(?:^|[#&])token=([0-9a-f]{32,})/i.exec(window.location.hash);
  if (m?.[1]) {
    try {
      sessionStorage.setItem(KEY, m[1]);
    } catch {
      // Private mode: the token then lives only in memory for this page load.
      memory = m[1];
    }
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  try {
    return sessionStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}
let memory: string | null = null;

async function get(path: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const token = takeToken();
  if (!token) throw new ApiError(401, "no token");
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    credentials: "omit",
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  const body: unknown = await res.json();
  if (typeof body !== "object" || body === null || Array.isArray(body))
    throw new ApiError(502, "bad response");
  return Object.fromEntries(Object.entries(body));
}

const isTrack = (b: Record<string, unknown>): b is Record<string, unknown> & TrackResponse =>
  Array.isArray(b["groups"]);
const isTrace = (b: Record<string, unknown>): b is Record<string, unknown> & TraceResponse =>
  Array.isArray(b["events"]);

export async function fetchTrack(signal?: AbortSignal): Promise<TrackResponse> {
  const b = await get("/api/track", signal);
  if (!isTrack(b)) throw new ApiError(502, "bad response");
  return b;
}
export async function fetchTrace(id: string, signal?: AbortSignal): Promise<TraceResponse> {
  const b = await get(`/api/items/${encodeURIComponent(id)}/trace`, signal);
  if (!isTrace(b)) throw new ApiError(502, "bad response");
  return b;
}

/** One line saying what happened and what to do (web-ui spec, Error state). */
export function describeError(e: unknown): string {
  if (e instanceof ApiError && (e.status === 401 || e.message === "no token")) {
    return "Vantage doesn't recognise this page. Open it again from `vantage open`.";
  }
  return "Can't reach the Vantage daemon. Start it with `vantage start`.";
}
