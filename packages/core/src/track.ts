// Track page view rules shared by the daemon API and the UI: attention grouping and the six-dot
// track (docs/UX.md#track, docs/specs/visual-language.md). Pure; no I/O.

export const TRACK_STAGES = ["asked", "built", "proven", "reviewed", "shipped", "verified"] as const;
export type TrackStage = (typeof TRACK_STAGES)[number];

/** Stages the Phase 1 sources can evidence; the rest stay hollow until their sources exist. */
export const PHASE1_STAGES: readonly TrackStage[] = ["asked", "built", "proven"];

export type Attention = "needs_you" | "in_progress" | "waiting" | "forgotten" | "done";
export const ATTENTION_ORDER: readonly Attention[] = [
  "needs_you",
  "in_progress",
  "waiting",
  "forgotten",
  "done",
];
export const ATTENTION_LABEL: Record<Attention, string> = {
  needs_you: "Needs you",
  in_progress: "In progress",
  waiting: "Waiting on others",
  forgotten: "Forgotten",
  done: "Done this week",
};

export type DotState = "done" | "current" | "no_proof" | "needs_you" | "skipped" | "not_yet";

export interface TrackItem {
  id: string;
  title: string;
  repo: string | null;
  stage: string;
  proofStatus: string;
  proofLevel: number;
  docsOnly: boolean;
  flags: { kind: string; severity: string; reason: string }[];
  /** The next three are always set by the daemon; optional so values built before D84 still type-check. */
  branch?: string | null;
  /** `https://host/owner/repo` of the item's repo; null when it has no remote. Always set by the daemon. */
  repoUrl?: string | null;
  /** False for a session with no code edits: the UI folds these into "Conversations without code". */
  hasEdits?: boolean;
  firstActivity?: string;
  /** Sessions feeding the item (default 1) and how many of them continue another (default 0); D86. */
  sessionCount?: number;
  derivedCount?: number;
  /** `anchor` (named by its key), `request` (first sentence of the first request) or `fallback`. */
  titleSource?: string;
  lastActivity: string;
}

/**
 * `thrashing` or `unproven_claim` means the item needs you now. `forgotten` alone is low urgency and has
 * its own group (proposed D94). Phase 1 has no source for "waiting".
 */
export function attentionOf(item: {
  stage: string;
  flags: readonly { severity: string; kind?: string }[];
}): Attention {
  if (item.flags.some((f) => f.kind !== "forgotten")) return "needs_you";
  if (item.flags.length > 0) return "forgotten";
  if (item.stage === "verified") return "done";
  return "in_progress";
}

/**
 * One state per stage, in TRACK_STAGES order. Shape carries meaning first (visual-language):
 * stages before the current one are done, stages that no configured source can evidence are
 * "skipped" (dashed, never green), and Proven is amber half-filled while the item has no fresh proof.
 */
export function dotsFor(
  item: Pick<TrackItem, "stage" | "proofStatus" | "docsOnly"> & { flags: readonly { severity: string }[] },
): DotState[] {
  const idx = TRACK_STAGES.findIndex((s) => s === item.stage);
  const red = item.flags.some((f) => f.severity === "red");
  return TRACK_STAGES.map((s, i): DotState => {
    if (!PHASE1_STAGES.includes(s)) return "skipped";
    if (s === "proven") {
      if (item.docsOnly || item.proofStatus === "not_required") return "skipped";
      if (idx >= i) return red ? "needs_you" : "done";
      return item.stage === "built" ? "no_proof" : "not_yet";
    }
    if (idx > i) return "done";
    if (idx === i) return red ? "needs_you" : "current";
    return "not_yet";
  });
}

export type SourceState = "ok" | "unconfigured";
export interface SourceHealth {
  source: string;
  state: SourceState;
  events: number;
  lastEventAt: string | null;
}

export const PROOF_STATES = ["none", "fresh", "expired", "failed", "weak", "not_required"] as const;
export const FLAG_FILTERS = ["thrashing", "unproven_claim", "forgotten", "none"] as const;
export const SINCE_VALUES = ["24h", "7d", "30d", "all"] as const;
export const SORT_KEYS = ["activity", "stage", "title", "repo", "flags"] as const;
export const GROUP_KEYS = ["attention", "repo", "stage", "none"] as const;
export const AGE_BUCKETS = ["today", "week", "older"] as const;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_QUERY_CHARS = 80;

export type ProofFilter = (typeof PROOF_STATES)[number];
export type FlagFilter = (typeof FLAG_FILTERS)[number];
export type Since = (typeof SINCE_VALUES)[number];
export type SortKey = (typeof SORT_KEYS)[number];
export type GroupKey = (typeof GROUP_KEYS)[number];
export type AgeBucket = (typeof AGE_BUCKETS)[number];

/** A validated `GET /api/track` query (docs/specs/web-ui.md#api-daemon-to-ui). Every field has a default. */
export interface TrackQuery {
  repo: string[];
  branch: string[];
  stage: TrackStage[];
  proof: ProofFilter[];
  flag: FlagFilter[];
  since: Since;
  hasEdits: boolean | null;
  q: string;
  sort: SortKey;
  order: "asc" | "desc";
  group: GroupKey;
  page: number;
  pageSize: number;
}

const MAX_LIST_VALUES = 50;
const MAX_VALUE_CHARS = 200;
const MAX_PAGE = 1_000_000;

export type ParsedTrackQuery = { ok: true; query: TrackQuery } | { ok: false; error: string };

const bad = (k: string): ParsedTrackQuery => ({ ok: false, error: `bad value for ${k}` });

/**
 * Validates query parameters against allow-lists. Never throws: bad input is `{ok: false}` with a plain
 * message that names the parameter, never echoing its value. Free-text values (repo, branch, q) are
 * length-bounded here; the daemon binds them as SQL parameters and escapes LIKE wildcards.
 */
export function parseTrackQuery(params: URLSearchParams): ParsedTrackQuery {
  const known = new Set([
    "repo",
    "branch",
    "stage",
    "proof",
    "flag",
    "since",
    "hasEdits",
    "q",
    "sort",
    "order",
    "group",
    "page",
    "pageSize",
  ]);
  const seen = new Set<string>();
  for (const k of params.keys()) {
    if (!known.has(k)) return { ok: false, error: "unknown parameter" };
    if (seen.has(k)) return { ok: false, error: `repeated parameter: ${k}` };
    seen.add(k);
  }
  const raw = (k: string): string | undefined => {
    const v = params.get(k);
    return v === null || v === "" ? undefined : v;
  };
  const free = (k: string): string[] | null => {
    const v = raw(k);
    if (v === undefined) return [];
    const parts = [...new Set(v.split(",").filter((x) => x !== ""))];
    if (parts.length > MAX_LIST_VALUES || parts.some((x) => x.length > MAX_VALUE_CHARS)) return null;
    return parts;
  };
  const allowed = <T extends string>(k: string, list: readonly T[]): T[] | null => {
    const v = raw(k);
    if (v === undefined) return [];
    const parts = [...new Set(v.split(",").filter((x) => x !== ""))];
    const ok = parts.filter((x): x is T => list.some((l) => l === x));
    return ok.length === parts.length ? ok : null;
  };
  const one = <T extends string>(k: string, list: readonly T[], dflt: T): T | null => {
    const v = raw(k);
    if (v === undefined) return dflt;
    return list.find((l) => l === v) ?? null;
  };

  const repo = free("repo");
  if (!repo) return bad("repo");
  const branch = free("branch");
  if (!branch) return bad("branch");
  const stage = allowed("stage", TRACK_STAGES);
  if (!stage) return bad("stage");
  const proof = allowed("proof", PROOF_STATES);
  if (!proof) return bad("proof");
  const flag = allowed("flag", FLAG_FILTERS);
  if (!flag) return bad("flag");
  const since = one("since", SINCE_VALUES, "7d");
  if (!since) return bad("since");
  const sort = one("sort", SORT_KEYS, "activity");
  if (!sort) return bad("sort");
  const order = one("order", ["asc", "desc"] as const, "desc");
  if (!order) return bad("order");
  const group = one("group", GROUP_KEYS, "attention");
  if (!group) return bad("group");
  const he = raw("hasEdits");
  if (he !== undefined && he !== "true" && he !== "false") return bad("hasEdits");
  const q = raw("q") ?? "";
  if (q.length > MAX_QUERY_CHARS) return bad("q");
  const int = (k: string, dflt: number, max: number): number | null => {
    const v = raw(k);
    if (v === undefined) return dflt;
    if (!/^\d{1,9}$/.test(v)) return null;
    const n = Number(v);
    return n >= 1 && n <= max ? n : null;
  };
  const page = int("page", 1, MAX_PAGE);
  if (page === null) return bad("page");
  const pageSize = int("pageSize", DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (pageSize === null) return bad("pageSize");
  return {
    ok: true,
    query: {
      repo,
      branch,
      stage,
      proof,
      flag,
      since,
      hasEdits: he === undefined ? null : he === "true",
      q,
      sort,
      order,
      group,
      page,
      pageSize,
    },
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Title for an item with no name of its own, from repo, branch and first activity date only
 * (`claude-code · main · Oct 14`). Never from prompt text (a privacy decision, see D84's scope).
 */
export function fallbackTitle(parts: {
  repo: string | null;
  branch: string | null;
  firstActivity: string;
  id: string;
}): string {
  const t = Date.parse(parts.firstActivity);
  const date = Number.isNaN(t)
    ? null
    : `${MONTHS[new Date(t).getUTCMonth()] ?? ""} ${new Date(t).getUTCDate()}`;
  const named = [parts.repo, parts.branch].filter((x): x is string => !!x);
  if (named.length === 0) return ["Session " + parts.id.slice(0, 8), date].filter(Boolean).join(" · ");
  return [...named, date].filter(Boolean).join(" · ");
}

export interface TrackGroup {
  /** Stable key: `needs_you`, `repo:<name>`, `stage:built`, `all`. Always set by the daemon (see TrackItem). */
  id?: string;
  label: string;
  /** Items in this group across the whole filter, not just this page. Always set by the daemon. */
  total?: number;
  /** Set only when grouped by attention. */
  attention?: Attention;
  /** Items of the current page that belong to the group. */
  items: TrackItem[];
}

export type Counts = Record<string, number>;
/** Counts per value, each over the items that pass every filter except that dimension's own. */
export interface TrackFacets {
  repo: Counts;
  branch: Counts;
  stage: Counts;
  proof: Counts;
  flag: Counts;
  age: Record<AgeBucket, number>;
  hasEdits: { true: number; false: number };
}

export interface TrackResponse {
  generatedAt: string;
  /** When the derived tables were last rebuilt; null before the first pass. */
  lastPassAt: string | null;
  /** True when the last pass is older than STALE_PASS_MS: rows may lag the evidence. */
  stale: boolean;
  /** `page` and `facets` are always set by the daemon; optional so older mirrors still type-check. */
  page?: { page: number; pageSize: number; total: number; pages: number };
  facets?: TrackFacets;
  groups: TrackGroup[];
  sources: SourceHealth[];
}

/** What the daemon actually sends: `TrackResponse` with the optional D84 parts all present. */
export type TrackView = Omit<TrackResponse, "page" | "facets" | "groups"> & {
  page: NonNullable<TrackResponse["page"]>;
  facets: TrackFacets;
  groups: (TrackGroup & { id: string; total: number })[];
};

export const STALE_PASS_MS = 5 * 60_000;

export interface TraceEvent {
  eventId: number;
  source: string;
  kind: string;
  occurredAt: string;
  /** Rule that linked the event to this item; null for events not linked by a rule. */
  rule: string | null;
  undone: boolean;
}
export interface TraceResponse {
  id: string;
  events: TraceEvent[];
  transitions: { from: string | null; to: string; at: string; eventId: number; reason: string }[];
  flags: { kind: string; severity: string; reason: string; raisedAt: string }[];
  proofs: {
    eventId: number;
    level: number;
    state: string;
    weakReason: string | null;
    command: string;
    ranAt: string;
  }[];
}
export interface DiagnosticsResponse {
  generatedAt: string;
  sources: SourceHealth[];
  events: number;
  items: number;
  lastPassAt: string | null;
  schemaVersion: number;
}

/**
 * `https://host/owner/repo` from a normalised remote (`host/owner/repo`, optionally followed by
 * `#<first commit>` as in `repoKey`). Null when it names no host and repo path, so a folder name or
 * `no-remote` never becomes a link. Only characters a host and a repo path may hold pass.
 */
export function repoUrlOf(repo: string | null | undefined): string | null {
  const path = (repo ?? "").split("#")[0] ?? "";
  const m = /^([a-z0-9-]+(?:\.[a-z0-9-]+)+)\/([\w.-]+(?:\/[\w.-]+)+)$/i.exec(path);
  return m ? `https://${m[1]}/${m[2]}` : null;
}

/** The project name a person reads: `owner/repo` for a remote, the folder name otherwise, null for none. */
export function projectNameOf(repo: string | null | undefined): string | null {
  const path = (repo ?? "").split("#")[0] ?? "";
  if (path === "" || path === "no-remote") return null;
  return repoUrlOf(path) ? path.slice(path.indexOf("/") + 1) : path;
}
