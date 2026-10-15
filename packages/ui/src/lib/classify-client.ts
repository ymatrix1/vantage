// Client for `/api/classify/*` (docs/specs/classify.md#api). Separate from api.ts so the Track page work does not
// collide with it. Every call carries the token as a header, never in the URL.
import { ApiError, takeToken } from "./api";

export type Kind = "title" | "topic" | "group";

export interface Counts {
  open: Record<Kind, number>;
  accepted: number;
  dismissed: number;
  undone: number;
}
export interface Batch {
  id: string;
  action: "accept" | "dismiss" | "auto_accept";
  counts: Record<Kind, number>;
  total: number;
  createdAt: string;
  undone: boolean;
}
export interface JobStatus {
  state: "idle" | "running";
  callsDone: number;
  callsPlanned: number;
  callsFailed: number;
  suggestions: number;
  capReached: boolean;
  stoppedEarly: boolean;
  lastAuto: { total: number } | null;
}
export interface ClassifyStatus {
  enabled: boolean;
  blockers: string[];
  model: string;
  dailyCalls: number;
  callsToday: number;
  autoAccept: string;
  job: JobStatus;
  counts: Counts;
  lastBatch: Batch | null;
}
export interface Suggestion {
  id: number;
  itemKey: string;
  kind: Kind;
  confidence: number;
  summary: string;
  reason: string;
  itemTitle: string;
  repo: string | null;
}
export interface Filter {
  kinds?: Kind[];
  minConfidence?: number;
  repo?: string;
}
export interface Preview {
  total: number;
  byKind: Record<Kind, number>;
  sample: Suggestion[];
  token: string;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStatus = (v: unknown): v is ClassifyStatus =>
  isObject(v) && isObject(v["counts"]) && isObject(v["job"]);
const isOpen = (v: unknown): v is { total: number; rows: Suggestion[] } =>
  isObject(v) && Array.isArray(v["rows"]);
const isPreview = (v: unknown): v is Preview =>
  isObject(v) && typeof v["token"] === "string" && isObject(v["byKind"]);
const isApplied = (v: unknown): v is { total: number; batchId: string } =>
  isObject(v) && typeof v["batchId"] === "string";
const isUndone = (v: unknown): v is { undone: Batch } => isObject(v) && isObject(v["undone"]);
const anything = (v: unknown): v is unknown => v !== undefined;

async function call<T>(
  method: "GET" | "POST",
  path: string,
  check: (v: unknown) => v is T,
  body?: unknown,
): Promise<T> {
  const token = takeToken();
  if (!token) throw new ApiError(401, "no token");
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    cache: "no-store",
    credentials: "omit",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  const parsed: unknown = await res.json();
  if (!check(parsed)) throw new ApiError(502, "bad response");
  return parsed;
}

export const fetchStatus = (): Promise<ClassifyStatus> => call("GET", "/api/classify/status", isStatus);
export const startRun = (): Promise<unknown> => call("POST", "/api/classify/run", anything, {});
export const fetchOpen = (limit = 100): Promise<{ total: number; rows: Suggestion[] }> =>
  call("GET", `/api/classify/suggestions?status=suggested&limit=${limit}`, isOpen);
export const preview = (action: "accept" | "dismiss", filter: Filter): Promise<Preview> =>
  call("POST", "/api/classify/preview", isPreview, { action, filter });
export const apply = (
  action: "accept" | "dismiss",
  filter: Filter,
  token: string,
): Promise<{ total: number; batchId: string }> =>
  call("POST", "/api/classify/apply", isApplied, { action, filter, token });
export const decideOne = (action: "accept" | "dismiss", id: number): Promise<unknown> =>
  call("POST", "/api/classify/decide", anything, { action, id });
export const undo = (): Promise<{ undone: Batch }> => call("POST", "/api/classify/undo", isUndone, {});
