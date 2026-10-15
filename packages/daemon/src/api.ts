// Read-only views behind the HTTP API (docs/specs/web-ui.md#api-daemon-to-ui). Pure reads over the
// derived tables: nothing here writes.
import {
  ATTENTION_LABEL,
  ATTENTION_ORDER,
  FLAG_FILTERS,
  PROOF_STATES,
  STALE_PASS_MS,
  TRACK_STAGES,
  attentionOf,
  orgOf,
  projectNameOf,
  repoUrlOf,
  type AgeBucket,
  type AskedEvidence,
  type Counts,
  type DiagnosticsResponse,
  type SortKey,
  type SourceHealth,
  type TraceResponse,
  type TrackFacets,
  type TrackItem,
  type TrackQuery,
  type TrackView,
} from "@vantage/core";
import { itemSessionCounts } from "./lineage.ts";
import { linksForItem } from "./linking.ts";
import { getItem, summary, type ItemSummary } from "./stages.ts";
import type { Store } from "./store.ts";
import { requestTitleMap, sessionNameMap } from "./titles.ts";

/** Sources the product plans for; those with no events yet show as unconfigured (hollow). */
const KNOWN_SOURCES = ["claude_code", "git", "github", "ci", "tracker", "slack"];

function sourceHealth(store: Store): SourceHealth[] {
  const seen = new Map<string, SourceHealth>();
  for (const r of store.db
    .prepare("SELECT source, COUNT(*) AS n, MAX(occurred_at) AS last FROM events GROUP BY source")
    .all()) {
    const source = String(r["source"]);
    seen.set(source, {
      source,
      state: "ok",
      events: Number(r["n"]),
      lastEventAt: typeof r["last"] === "string" ? r["last"] : null,
    });
  }
  const out = KNOWN_SOURCES.map(
    (s): SourceHealth => seen.get(s) ?? { source: s, state: "unconfigured", events: 0, lastEventAt: null },
  );
  for (const [s, h] of seen) if (!KNOWN_SOURCES.includes(s)) out.push(h);
  return out;
}

function lastPassAt(store: Store): string | null {
  const v = store.db.prepare("SELECT MAX(updated_at) AS t FROM work_items").get()?.["t"];
  return typeof v === "string" ? v : null;
}

const STAGE_LABEL: Record<string, string> = {
  asked: "Asked",
  built: "Built",
  proven: "Proven",
  reviewed: "Reviewed",
  shipped: "Shipped",
  verified: "Verified",
};

/** What `GET /api/track` with no parameters means (docs/specs/web-ui.md). */
export const DEFAULT_QUERY: TrackQuery = {
  org: [],
  repo: [],
  branch: [],
  stage: [],
  proof: [],
  flag: [],
  since: "7d",
  hasEdits: null,
  q: "",
  sort: "activity",
  order: "desc",
  group: "attention",
  page: 1,
  pageSize: 25,
};

type Param = string | number;
interface Where {
  sql: string;
  params: Param[];
}
type Dim = "org" | "repo" | "branch" | "stage" | "proof" | "flag" | "since" | "hasEdits";

// The owner of `w.repo` (`host/Owner/repo`): the second path segment when the first looks like a host,
// `local` for a folder name, null without a repo. Built from SQL string functions so it filters and groups.
const orgSql = (col: string): string => {
  const rest = `substr(${col}, instr(${col}, '/') + 1)`;
  return `CASE WHEN ${col} IS NULL THEN NULL
  WHEN instr(substr(${col}, 1, instr(${col}, '/') - 1), '.') > 0 AND instr(${rest}, '/') > 0
    THEN substr(${rest}, 1, instr(${rest}, '/') - 1)
  ELSE 'local' END`;
};
const ORG_SQL = orgSql("w.repo");
const ORG_OF_REPO = orgSql("r.repo");

const OPEN_FLAG = "f.work_item_id = w.id AND f.cleared_at IS NULL AND f.dismissed = 0";
const HOUR = 3_600_000;
const SINCE_MS: Record<string, number> = { "24h": 24 * HOUR, "7d": 168 * HOUR, "30d": 720 * HOUR };
/** Same shape as event timestamps (no milliseconds), so string comparison matches time order. */
const iso = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const marks = (n: number): string => Array.from({ length: n }, () => "?").join(",");
const escapeLike = (v: string): string => v.replace(/[\\%_]/g, (c) => `\\${c}`);
// Sort expressions come from this allow-list only; the query value picks a key, never text.
const STAGE_RANK = `CASE w.stage ${TRACK_STAGES.map((st, i) => `WHEN '${st}' THEN ${i}`).join(" ")} ELSE ${TRACK_STAGES.length} END`;
const FLAG_COUNT = `(SELECT COUNT(*) FROM flags f WHERE ${OPEN_FLAG})`;
const URGENT_FLAG_COUNT = `(SELECT COUNT(*) FROM flags f WHERE ${OPEN_FLAG} AND f.kind <> 'forgotten')`;
const SORT_SQL: Record<SortKey, string> = {
  activity: "w.last_activity",
  stage: STAGE_RANK,
  title: "lower(w.title)",
  repo: "lower(coalesce(w.repo, ''))",
  flags: FLAG_COUNT,
};
const LIKE = "LIKE ? ESCAPE '\\'";

/** The filter as SQL over `work_items w`, leaving out one dimension (facets count over the others). */
function whereOf(q: TrackQuery, now: Date, skip: Dim | null): Where {
  const parts: string[] = [];
  const params: Param[] = [];
  const inList = (dim: Dim, col: string, values: readonly string[]): void => {
    if (skip === dim || values.length === 0) return;
    parts.push(`${col} IN (${marks(values.length)})`);
    params.push(...values);
  };
  // An item matches a repo or an owner when any repo it touched does (D190).
  const anyRepo = (dim: Dim, expr: string, values: readonly string[]): void => {
    if (skip === dim || values.length === 0) return;
    parts.push(
      `EXISTS (SELECT 1 FROM item_repos r WHERE r.item_key = w.item_key AND lower(${expr}) IN (${marks(values.length)}))`,
    );
    params.push(...values.map((v) => v.toLowerCase()));
  };
  anyRepo("org", ORG_OF_REPO, q.org);
  anyRepo("repo", "r.repo", q.repo);
  inList("branch", "w.branch", q.branch);
  inList("stage", "w.stage", q.stage);
  inList("proof", "w.proof_status", q.proof);
  if (skip !== "flag" && q.flag.length > 0) {
    const ors = q.flag.map((k) =>
      k === "none"
        ? `NOT EXISTS (SELECT 1 FROM flags f WHERE ${OPEN_FLAG})`
        : `EXISTS (SELECT 1 FROM flags f WHERE ${OPEN_FLAG} AND f.kind = ?)`,
    );
    parts.push(`(${ors.join(" OR ")})`);
    params.push(...q.flag.filter((k) => k !== "none"));
  }
  if (skip !== "since" && q.since !== "all") {
    parts.push("w.last_activity >= ?");
    params.push(iso(now.getTime() - (SINCE_MS[q.since] ?? 0)));
  }
  if (skip !== "hasEdits" && q.hasEdits !== null) {
    parts.push("w.has_edits = ?");
    params.push(q.hasEdits ? 1 : 0);
  }
  if (q.q !== "") {
    const like = `%${escapeLike(q.q.toLowerCase())}%`;
    parts.push(
      `(lower(w.title) ${LIKE} OR lower(coalesce(w.repo, '')) ${LIKE} OR lower(coalesce(w.branch, '')) ${LIKE}
        OR EXISTS (SELECT 1 FROM item_repos r WHERE r.item_key = w.item_key AND lower(r.repo) ${LIKE}))`,
    );
    params.push(like, like, like, like);
  }
  return { sql: parts.length > 0 ? parts.join(" AND ") : "1", params };
}

const countBy = (store: Store, col: string, w: Where, extra = ""): Counts => {
  const out: Counts = {};
  for (const r of store.db
    .prepare(
      `SELECT ${col} AS k, COUNT(*) AS n FROM work_items w WHERE ${w.sql} ${extra} GROUP BY ${col} ORDER BY n DESC, k LIMIT 200`,
    )
    .all(...w.params)) {
    out[String(r["k"])] = Number(r["n"]);
  }
  return out;
};
const zeroed = (keys: readonly string[], got: Counts): Counts =>
  Object.fromEntries(keys.map((k) => [k, got[k] ?? 0]));
const scalar = (store: Store, sql: string, params: Param[]): number =>
  Number(store.db.prepare(sql).get(...params)?.["n"] ?? 0);

function facetsOf(store: Store, q: TrackQuery, now: Date): TrackFacets {
  const nowMs = now.getTime();
  const flag: Counts = {};
  const wf = whereOf(q, now, "flag");
  for (const r of store.db
    .prepare(
      `SELECT f.kind AS k, COUNT(DISTINCT w.id) AS n FROM work_items w JOIN flags f ON f.work_item_id = w.id
       WHERE f.cleared_at IS NULL AND f.dismissed = 0 AND ${wf.sql} GROUP BY f.kind`,
    )
    .all(...wf.params)) {
    flag[String(r["k"])] = Number(r["n"]);
  }
  flag["none"] = scalar(
    store,
    `SELECT COUNT(*) AS n FROM work_items w WHERE ${wf.sql} AND NOT EXISTS (SELECT 1 FROM flags f WHERE ${OPEN_FLAG})`,
    wf.params,
  );
  // Age buckets count over everything except the `since` filter, so they show what a wider window adds.
  const wa = whereOf(q, now, "since");
  const age: Record<AgeBucket, number> = { today: 0, week: 0, older: 0 };
  for (const r of store.db
    .prepare(
      `SELECT CASE WHEN w.last_activity >= ? THEN 'today' WHEN w.last_activity >= ? THEN 'week' ELSE 'older' END AS k,
         COUNT(*) AS n FROM work_items w WHERE ${wa.sql} GROUP BY k`,
    )
    .all(iso(nowMs - 24 * HOUR), iso(nowMs - 168 * HOUR), ...wa.params)) {
    const k = String(r["k"]);
    if (k === "today" || k === "week" || k === "older") age[k] = Number(r["n"]);
  }
  const he = countBy(store, "w.has_edits", whereOf(q, now, "hasEdits"));
  // An item counts once per repo and once per owner it touched, so the counts can add up to more than the
  // rows (D190). Each count is still of distinct items.
  const orgs: Counts = {};
  const wo = whereOf(q, now, "org");
  for (const r of store.db
    .prepare(
      `SELECT MIN(${ORG_OF_REPO}) AS k, COUNT(DISTINCT w.item_key) AS n FROM work_items w
       JOIN item_repos r ON r.item_key = w.item_key WHERE ${wo.sql}
       GROUP BY lower(${ORG_OF_REPO}) ORDER BY n DESC, k LIMIT 200`,
    )
    .all(...wo.params)) {
    orgs[String(r["k"])] = Number(r["n"]);
  }
  const repos: Counts = {};
  const wr = whereOf(q, now, "repo");
  for (const r of store.db
    .prepare(
      `SELECT r.repo AS k, COUNT(DISTINCT w.item_key) AS n FROM work_items w
       JOIN item_repos r ON r.item_key = w.item_key WHERE ${wr.sql}
       GROUP BY r.repo ORDER BY n DESC, k LIMIT 200`,
    )
    .all(...wr.params)) {
    repos[String(r["k"])] = Number(r["n"]);
  }
  return {
    org: orgs,
    repo: repos,
    branch: countBy(store, "w.branch", whereOf(q, now, "branch"), "AND w.branch IS NOT NULL"),
    stage: zeroed(TRACK_STAGES, countBy(store, "w.stage", whereOf(q, now, "stage"))),
    proof: zeroed(PROOF_STATES, countBy(store, "w.proof_status", whereOf(q, now, "proof"))),
    flag: zeroed(FLAG_FILTERS, flag),
    age,
    hasEdits: { true: he["1"] ?? 0, false: he["0"] ?? 0 },
  };
}

/** Group totals over the whole filter, keyed by group id. */
function groupTotals(store: Store, q: TrackQuery, w: Where): Map<string, number> {
  const out = new Map<string, number>();
  if (q.group === "attention") {
    const r = store.db
      .prepare(
        `SELECT SUM(CASE WHEN urgent > 0 THEN 1 ELSE 0 END) AS needs,
           SUM(CASE WHEN urgent = 0 AND fl > 0 THEN 1 ELSE 0 END) AS forgotten,
           SUM(CASE WHEN fl = 0 AND stage = 'verified' THEN 1 ELSE 0 END) AS done, COUNT(*) AS n
         FROM (SELECT w.stage AS stage, ${FLAG_COUNT} AS fl, ${URGENT_FLAG_COUNT} AS urgent
               FROM work_items w WHERE ${w.sql})`,
      )
      .get(...w.params);
    const needs = Number(r?.["needs"] ?? 0);
    const done = Number(r?.["done"] ?? 0);
    const forgotten = Number(r?.["forgotten"] ?? 0);
    out.set("needs_you", needs);
    out.set("forgotten", forgotten);
    out.set("in_progress", Number(r?.["n"] ?? 0) - needs - forgotten - done);
    out.set("done", done);
  } else if (q.group === "org") {
    for (const r of store.db
      .prepare(
        `SELECT lower(${ORG_SQL}) AS k, COUNT(*) AS n FROM work_items w WHERE ${w.sql} GROUP BY lower(${ORG_SQL})`,
      )
      .all(...w.params)) {
      out.set(`org:${typeof r["k"] === "string" ? r["k"] : ""}`, Number(r["n"]));
    }
  } else if (q.group === "repo") {
    for (const r of store.db
      .prepare(`SELECT w.repo AS k, COUNT(*) AS n FROM work_items w WHERE ${w.sql} GROUP BY w.repo`)
      .all(...w.params)) {
      out.set(`repo:${typeof r["k"] === "string" ? r["k"] : ""}`, Number(r["n"]));
    }
  } else if (q.group === "branch") {
    for (const r of store.db
      .prepare(`SELECT w.branch AS k, COUNT(*) AS n FROM work_items w WHERE ${w.sql} GROUP BY w.branch`)
      .all(...w.params)) {
      out.set(`branch:${typeof r["k"] === "string" ? r["k"] : ""}`, Number(r["n"]));
    }
  } else if (q.group === "stage") {
    for (const r of store.db
      .prepare(`SELECT w.stage AS k, COUNT(*) AS n FROM work_items w WHERE ${w.sql} GROUP BY w.stage`)
      .all(...w.params)) {
      out.set(`stage:${String(r["k"])}`, Number(r["n"]));
    }
  }
  return out;
}

const toTrackItem = (
  i: ItemSummary,
  sessions?: { sessionCount: number; derivedCount: number },
): TrackItem => ({
  id: i.itemKey,
  title: i.title,
  repo: i.repo,
  repos: i.repos,
  repoUrl: repoUrlOf(i.repo),
  org: orgOf(i.repo),
  branch: i.branch,
  stage: i.stage,
  proofStatus: i.proofStatus,
  proofLevel: i.proofLevel,
  docsOnly: i.docsOnly,
  hasEdits: i.hasEdits,
  titleSource: i.titleSource,
  flags: i.flags.map((f) => ({ kind: f.kind, severity: f.severity, reason: f.reason })),
  firstActivity: i.firstActivity,
  // An item with no linked session event (git only) counts as one session with none derived.
  sessionCount: sessions?.sessionCount ?? 1,
  derivedCount: sessions?.derivedCount ?? 0,
  lastActivity: i.lastActivity,
});

/**
 * Track rows for one query. Cost: the filter is one bounded scan of `work_items` (a few thousand rows
 * at most; `last_activity`, `(repo, last_activity)` and `(stage, last_activity)` are indexed), run once
 * for the count, once for the page (ORDER BY, LIMIT pageSize) and once per facet dimension (about ten
 * scans in all). Flag tests are lookups on the unique `(work_item_id, kind)` index. Only page rows load
 * their flags. Nothing is interpolated except allow-listed column and sort text; every user value is a
 * bound parameter.
 */
export function trackView(store: Store, now = new Date(), q: TrackQuery = DEFAULT_QUERY): TrackView {
  const w = whereOf(q, now, null);
  const total = scalar(store, `SELECT COUNT(*) AS n FROM work_items w WHERE ${w.sql}`, w.params);
  const pages = Math.max(1, Math.ceil(total / q.pageSize));
  const order = q.order === "asc" ? "ASC" : "DESC";
  const tie = q.sort === "activity" ? "" : "w.last_activity DESC, ";
  const items = store.db
    .prepare(
      `SELECT w.* FROM work_items w WHERE ${w.sql} ORDER BY ${SORT_SQL[q.sort]} ${order}, ${tie}w.item_key LIMIT ? OFFSET ?`,
    )
    .all(...w.params, q.pageSize, (q.page - 1) * q.pageSize)
    .map((r) => {
      const sum = summary(store, r);
      return toTrackItem(sum, itemSessionCounts(store, sum.itemKey).get(sum.itemKey));
    });

  const totals = groupTotals(store, q, w);
  const groups: TrackView["groups"] = [];
  if (q.group === "attention") {
    for (const attention of ATTENTION_ORDER) {
      groups.push({
        id: attention,
        label: ATTENTION_LABEL[attention],
        total: totals.get(attention) ?? 0,
        attention,
        items: items.filter((i) => attentionOf(i) === attention),
      });
    }
  } else if (q.group === "none") {
    groups.push({ id: "all", label: "All items", total, items });
  } else {
    const key = (i: TrackItem): string =>
      q.group === "repo"
        ? `repo:${i.repo ?? ""}`
        : q.group === "branch"
          ? `branch:${i.branch ?? ""}`
          : q.group === "org"
            ? `org:${(i.org ?? "").toLowerCase()}`
            : `stage:${i.stage}`;
    const byId = new Map<string, TrackItem[]>();
    for (const i of items) byId.set(key(i), [...(byId.get(key(i)) ?? []), i]);
    const label = (id: string): string => {
      if (q.group === "repo") return projectNameOf(id.slice(5)) ?? "No repo";
      if (q.group === "branch") return id.slice(7) || "No branch";
      if (q.group === "org") {
        // Show the owner as most of its repos spell it (ties: the smaller spelling); no remote is "Local".
        const spellings = new Map<string, number>();
        for (const i of byId.get(id) ?? []) spellings.set(i.org ?? "", (spellings.get(i.org ?? "") ?? 0) + 1);
        const shown = [...spellings].toSorted((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? "";
        return shown === "" ? "No repo" : shown === "local" ? "Local" : shown;
      }
      return STAGE_LABEL[id.slice(6)] ?? id.slice(6);
    };
    const rank = (id: string): number =>
      q.group === "stage" ? TRACK_STAGES.findIndex((s) => `stage:${s}` === id) : 0;
    const ids = [...byId.keys()].toSorted(
      (a, b) =>
        rank(a) - rank(b) ||
        (["repo:", "org:", "branch:"].includes(a) ? 1 : 0) -
          (["repo:", "org:", "branch:"].includes(b) ? 1 : 0) ||
        a.localeCompare(b),
    );
    for (const id of ids) {
      groups.push({ id, label: label(id), total: totals.get(id) ?? 0, items: byId.get(id) ?? [] });
    }
  }
  const pass = lastPassAt(store);
  return {
    generatedAt: now.toISOString(),
    lastPassAt: pass,
    stale: pass !== null && now.getTime() - Date.parse(pass) > STALE_PASS_MS,
    page: { page: q.page, pageSize: q.pageSize, total, pages },
    facets: facetsOf(store, q, now),
    groups,
    sources: sourceHealth(store),
  };
}

/** Why an item looks the way it does (D45): linked events with the rule that linked them, stage history and proofs. */
export function traceView(store: Store, id: string): TraceResponse | null {
  const item = getItem(store, id);
  if (!item) return null;
  const events = linksForItem(store, id).map((l) => {
    const e = store.db.prepare("SELECT source, kind, occurred_at FROM events WHERE id = ?").get(l.eventId);
    return {
      eventId: l.eventId,
      source: String(e?.["source"] ?? ""),
      kind: String(e?.["kind"] ?? ""),
      occurredAt: String(e?.["occurred_at"] ?? ""),
      rule: l.rule,
      undone: l.undoneAt !== null,
    };
  });
  return {
    id,
    events,
    asked: askedEvidence(store, id, item.transitions),
    flags: item.flags.map((f) => ({
      kind: f.kind,
      severity: f.severity,
      reason: f.reason,
      raisedAt: f.raisedAt,
    })),
    proofs: item.proofs.map((p) => ({
      eventId: p.eventId,
      level: p.level,
      state: p.state,
      weakReason: p.weakReason,
      command: p.command,
      ranAt: p.ranAt,
      type: p.type,
      stale: p.state === "expired" || p.expiredByEventId !== null,
    })),
    transitions: item.transitions,
  };
}

const ANCHOR_KINDS = ["issue_key", "branch", "worktree", "session"] as const;

/** The first stage change into Asked, with the anchor and session of its event. Ids and times only (D132). */
function askedEvidence(
  store: Store,
  id: string,
  transitions: { to: string; at: string; eventId: number }[],
): AskedEvidence | null {
  const t = transitions.find((x) => x.to === "asked");
  if (!t) return null;
  const e = store.db.prepare("SELECT session_id, occurred_at FROM events WHERE id = ?").get(t.eventId);
  const l = store.db
    .prepare(
      "SELECT anchor_kind, anchor_value FROM links WHERE event_id = ? AND item_key = ? AND undone_at IS NULL",
    )
    .get(t.eventId, id);
  const kind = ANCHOR_KINDS.find((k) => k === l?.["anchor_kind"]) ?? null;
  const value = typeof l?.["anchor_value"] === "string" ? l["anchor_value"] : null;
  const sessionId = typeof e?.["session_id"] === "string" ? e["session_id"] : null;
  // A worktree anchor is a path; only its folder name is shown (the same name the item's title used).
  const folder = value?.split(String.fromCharCode(92)).join("/").split("/").filter(Boolean).pop() ?? null;
  return {
    at: typeof e?.["occurred_at"] === "string" ? e["occurred_at"] : t.at,
    anchorKind: kind,
    anchorValue: kind === "issue_key" || kind === "branch" ? value : kind === "worktree" ? folder : null,
    sessionId,
    sessionName: sessionId
      ? (sessionNameMap(store).get(sessionId) ?? requestTitleMap(store).get(sessionId) ?? null)
      : null,
  };
}

export function diagnosticsView(store: Store, now = new Date()): DiagnosticsResponse {
  const v = store.db.prepare("SELECT version FROM schema_meta").get()?.["version"];
  return {
    generatedAt: now.toISOString(),
    sources: sourceHealth(store),
    events: store.countEvents(),
    items: Number(store.db.prepare("SELECT COUNT(*) AS n FROM work_items").get()?.["n"] ?? 0),
    lastPassAt: lastPassAt(store),
    schemaVersion: Number(v ?? 0),
  };
}
