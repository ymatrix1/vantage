// `/api/classify/*` (docs/specs/classify.md#api). Kept apart from api.ts so the Track page work does not
// collide with it. Pure routing: http.ts does the checks (host, origin, token) and the body read, then
// calls `classifyRoute`. Every write is a batch with an undo; nothing applies without a matching preview token.
import { callsToday, dryRun, type ClassifyJob } from "./classify-job.ts";
import { classifyBlockers, readClassifyConfig } from "./classify-config.ts";
import { classifyReport } from "./classify-report.ts";
import {
  SUGGESTION_KINDS,
  StaleSelectionError,
  applyBatch,
  lastOpenBatch,
  listBatches,
  listSuggestions,
  previewBatch,
  suggestionCounts,
  undoBatch,
  type BatchAction,
  type SuggestionFilter,
  type SuggestionKind,
  type SuggestionStatus,
} from "./classify-store.ts";
import type { Store } from "./store.ts";

export interface ClassifyApi {
  store: Store;
  home: string;
  projectsDir: string;
  job: ClassifyJob;
  now?: () => Date;
}

export interface RouteResult {
  status: number;
  body: unknown;
}

const ok = (body: unknown): RouteResult => ({ status: 200, body });
const bad = (error: string, status = 400): RouteResult => ({ status, body: { error } });

const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isKind = (v: unknown): v is SuggestionKind =>
  typeof v === "string" && (SUGGESTION_KINDS as readonly string[]).includes(v);
const STATUSES: readonly SuggestionStatus[] = ["suggested", "accepted", "dismissed", "undone"];

/** Reads a filter from a JSON body or a query string; null with an error message when it is malformed. */
export function parseFilter(
  v: unknown,
): { ok: true; filter: SuggestionFilter } | { ok: false; error: string } {
  if (v === undefined || v === null) return { ok: true, filter: {} };
  if (!isRec(v)) return { ok: false, error: "filter must be an object" };
  const filter: { kinds?: SuggestionKind[]; minConfidence?: number; repo?: string; ids?: number[] } = {};
  if (v["kinds"] !== undefined) {
    if (!Array.isArray(v["kinds"]) || !v["kinds"].every(isKind))
      return { ok: false, error: "kinds must be title, topic or group" };
    filter.kinds = v["kinds"];
  }
  if (v["minConfidence"] !== undefined) {
    const n = v["minConfidence"];
    if (typeof n !== "number" || !(n >= 0 && n <= 1))
      return { ok: false, error: "minConfidence must be from 0 to 1" };
    filter.minConfidence = n;
  }
  if (v["repo"] !== undefined) {
    if (typeof v["repo"] !== "string" || v["repo"].length > 200)
      return { ok: false, error: "repo must be a string" };
    filter.repo = v["repo"];
  }
  if (v["ids"] !== undefined) {
    const ids = v["ids"];
    const nums = Array.isArray(ids) ? ids.filter((i): i is number => Number.isInteger(i)) : [];
    if (!Array.isArray(ids) || ids.length > 5000 || nums.length !== ids.length)
      return { ok: false, error: "ids must be integers" };
    filter.ids = nums;
  }
  return { ok: true, filter };
}

const isAction = (v: unknown): v is "accept" | "dismiss" => v === "accept" || v === "dismiss";

export function statusView(api: ClassifyApi): unknown {
  const now = (api.now ?? (() => new Date()))();
  const cfg = readClassifyConfig(api.home);
  return {
    enabled: cfg.enabled,
    blockers: classifyBlockers(cfg),
    model: cfg.model,
    batchSize: cfg.batchSize,
    dailyCalls: cfg.dailyCalls,
    callsToday: callsToday(api.store, now),
    autoAccept: cfg.autoAccept,
    autoMinConfidence: cfg.autoMinConfidence,
    job: api.job.status(),
    counts: suggestionCounts(api.store),
    lastBatch: lastOpenBatch(api.store),
  };
}

/** Handles one request; null when the path is not a classify route. `body` is the parsed JSON of a POST, or undefined. */
export function classifyRoute(
  api: ClassifyApi,
  method: string,
  pathname: string,
  query: URLSearchParams,
  body: unknown,
): RouteResult | null {
  if (!pathname.startsWith("/api/classify/")) return null;
  const route = pathname.slice("/api/classify/".length);
  const now = (api.now ?? (() => new Date()))();
  if (method === "GET") {
    if (route === "status") return ok(statusView(api));
    if (route === "batches") return ok({ batches: listBatches(api.store) });
    if (route === "report") return ok(classifyReport(api.store));
    if (route === "dry-run") {
      const n = Number(query.get("sample") ?? 3);
      return ok(
        dryRun(
          api.store,
          readClassifyConfig(api.home),
          api.projectsDir,
          now,
          Number.isInteger(n) && n > 0 && n <= 20 ? n : 3,
        ),
      );
    }
    if (route === "suggestions") {
      const status = STATUSES.find((x) => x === (query.get("status") ?? "suggested"));
      if (!status) return bad("bad status");
      const kind = query.get("kind");
      const min = query.get("minConfidence");
      const parsed = parseFilter({
        ...(kind ? { kinds: [kind] } : {}),
        ...(min !== null ? { minConfidence: Number(min) } : {}),
        ...(query.get("repo") ? { repo: query.get("repo") } : {}),
      });
      if (!parsed.ok) return bad(parsed.error);
      const limit = Math.min(500, Math.max(1, Number(query.get("limit") ?? 100) || 100));
      const offset = Math.max(0, Number(query.get("offset") ?? 0) || 0);
      return ok(listSuggestions(api.store, parsed.filter, status, limit, offset));
    }
    return bad("not found", 404);
  }
  if (method !== "POST") return bad("method not allowed", 405);
  const b = isRec(body) ? body : {};
  if (route === "run") {
    const r = api.job.start();
    return r.started ? ok(r) : { status: r.reason === "running" ? 409 : 403, body: r };
  }
  if (route === "undo") {
    const id = typeof b["batchId"] === "string" ? b["batchId"] : undefined;
    const r = undoBatch(api.store, id, now);
    return r ? ok({ undone: r }) : bad("no batch to undo", 404);
  }
  if (route === "preview" || route === "apply" || route === "decide") {
    if (!isAction(b["action"])) return bad("action must be accept or dismiss");
    const parsed = parseFilter(b["filter"]);
    if (!parsed.ok) return bad(parsed.error);
    const action: BatchAction = b["action"];
    if (route === "preview") return ok(previewBatch(api.store, action, parsed.filter));
    if (route === "decide") {
      // One row, chosen by the user in the list: the row itself is the preview.
      const id = b["id"];
      if (typeof id !== "number" || !Number.isInteger(id)) return bad("id must be an integer");
      const filter = { ids: [id] };
      return ok(applyBatch(api.store, action, filter, previewBatch(api.store, action, filter).token, now));
    }
    if (typeof b["token"] !== "string") return bad("apply needs the token from a preview");
    try {
      return ok(applyBatch(api.store, action, parsed.filter, b["token"], now));
    } catch (e) {
      if (e instanceof StaleSelectionError) return bad(e.message, 409);
      throw e;
    }
  }
  return bad("not found", 404);
}
