// `vantage stats`: how useful is the Track page? Read-only aggregates from the local store.
// Output holds numbers and fixed labels only: no titles, commands, paths or repo names, so it is safe to
// paste into an issue (privacy boundary). The one echo is the `--repo` text the user typed.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { proofFamily, type ProofFamily } from "@vantage/core";
import { vantageHomeDir } from "@vantage/daemon";

export interface StatsOptions {
  /** ISO timestamp; only items last active, and events that happened, at or after it count. */
  since: string | null;
  /** Repo name as typed. Matches a path segment of the event's working directory. */
  repo: string | null;
  /** Rows in the per-day table. */
  days: number;
}

export interface DayRow {
  day: string;
  /** Items with a linked event that day. */
  active: number;
  /** Items whose first activity was that day. */
  created: number;
  /** Active items with a human-readable title. */
  titled: number;
  events: number;
  flagsRaised: number;
  reachedProven: number;
}

export interface Stats {
  schema: 1;
  generatedAt: string;
  since: string | null;
  repoFilter: string | null;
  items: { total: number; active24h: number; active7d: number; active30d: number };
  titles: { readable: number; fallback: number; readableShare: number | null };
  anchors: { issue: number; branch: number; worktree: number; session: number; other: number };
  /** Items with an open flag. `byKind` counts per flag kind, in the order forgotten, thrashing, unproven_claim. */
  needsYou: {
    total: number;
    recent48h: number;
    byKind: { kind: string; total: number; recent48h: number }[];
  };
  /** Lineage numbers (D86). Null fields mean the store has no such data. */
  sessions: {
    total: number;
    derived: number | null;
    derivedShare: number | null;
    perItemMedian: number | null;
    perItemMax: number | null;
    multiSessionItems: number | null;
    subagentRuns: number | null;
    /** Session links on items anchored by issue key, branch or worktree. */
    anchored: number;
    /** Session links on provisional per-session items. */
    provisional: number;
    anchoredShare: number | null;
    /**
     * Sessions in scope with an event on a non-default branch, counting only the branch stored in the event
     * (before D92) and also the branch recorded beside it from the transcript (after). The gap is what the
     * transcript branch fix added.
     */
    branch: {
      sessions: number;
      before: number;
      after: number;
      beforeShare: number | null;
      afterShare: number | null;
    };
  };
  stages: { asked: number; built: number; proven: number; other: number };
  /** Items with a code edit (Built or Proven, docs-only excluded) and how many reached Proven. */
  proven: { count: number; of: number; share: number | null };
  /** Built items (docs-only excluded) whose proof is expired, failed or weak: a proof exists, it just does not count. */
  builtProofLost: { count: number; of: number; share: number | null };
  /** `command.ran` events by recognised check family; the rest is one number. Never any command text. */
  commands: {
    total: number;
    recognised: { family: ProofFamily; count: number }[];
    notRecognised: number;
  };
  events: { total: number; bySource: { source: string; count: number }[] };
  db: { sizeBytes: number };
  stagePass: { lastAt: string | null; ageSeconds: number | null };
  days: DayRow[];
}

type Row = Record<string, unknown>;
type Param = string | number;
const n = (r: Row | undefined, c: string): number => Number(r?.[c] ?? 0);
const s = (r: Row, c: string): string => {
  const v = r[c];
  return typeof v === "string" ? v : "";
};
const share = (part: number, whole: number): number | null => (whole > 0 ? part / whole : null);

const HOUR = 3_600_000;
const SAFE_WORD = /^[a-z][a-z0-9_.-]{0,31}$/;

const onBranch = (expr: string): string => `${expr} IS NOT NULL AND ${expr} NOT IN ('main', 'master')`;
const KIND = "substr(w.item_key, 1, instr(w.item_key, ':') - 1)";
/**
 * A fallback title: every provisional session item. Its title is built from repo, branch and date, or
 * `Session xxxxxxxx` (never from prompt text, D84), so it names no request. Issue, branch and worktree
 * items carry their anchor as the title.
 */
const UNTITLED = "w.item_key LIKE 'session:%'";

/** SQL for "this event happened in the repo": a path segment of its cwd or repo root equals the name. */
function repoPredicate(alias: string): string {
  const seg = (path: string): string =>
    `instr('/' || lower(replace(coalesce(json_extract(${alias}.payload_json, '${path}'), ''), char(92), '/')) || '/', ?) > 0`;
  return `(${seg("$.cwd")} OR ${seg("$.repoRoot")})`;
}

interface Scope {
  where: string;
  params: Param[];
}

/** Which work items (alias `w`) are in scope. */
function itemScope(opts: StatsOptions): Scope {
  const where: string[] = ["1 = 1"];
  const params: Param[] = [];
  if (opts.since) {
    where.push("w.last_activity >= ?");
    params.push(opts.since);
  }
  if (opts.repo) {
    const needle = `/${opts.repo.toLowerCase()}/`;
    where.push(
      `EXISTS (SELECT 1 FROM links l JOIN events e ON e.id = l.event_id
         WHERE l.item_key = w.item_key AND l.undone_at IS NULL
           AND ${repoPredicate("e")})`,
    );
    params.push(needle, needle);
  }
  return { where: where.join(" AND "), params };
}

/** Which events (alias `e`) are in scope. */
function eventScope(opts: StatsOptions): Scope {
  const where: string[] = ["1 = 1"];
  const params: Param[] = [];
  if (opts.since) {
    where.push("e.occurred_at >= ?");
    params.push(opts.since);
  }
  if (opts.repo) {
    const needle = `/${opts.repo.toLowerCase()}/`;
    where.push(repoPredicate("e"));
    params.push(needle, needle);
  }
  return { where: where.join(" AND "), params };
}

const utcDay = (d: Date): string => d.toISOString().slice(0, 10);

/** Computes every metric from an open (read-only) database. Never writes. */
export function computeStats(db: DatabaseSync, opts: StatsOptions, now: Date, dbSizeBytes = 0): Stats {
  const q = (sql: string, ...params: Param[]): Row[] => db.prepare(sql).all(...params);
  const q1 = (sql: string, ...params: Param[]): Row | undefined => q(sql, ...params)[0];
  const iso = (msAgo: number): string => new Date(now.getTime() - msAgo).toISOString();

  const is = itemScope(opts);
  const es = eventScope(opts);
  const count = (extra: string, ...params: Param[]): number =>
    n(
      q1(`SELECT COUNT(*) AS c FROM work_items w WHERE ${is.where} AND ${extra}`, ...is.params, ...params),
      "c",
    );

  const total = count("1 = 1");
  const fallback = count(UNTITLED);

  const anchors = { issue: 0, branch: 0, worktree: 0, session: 0, other: 0 };
  for (const r of q(
    `SELECT ${KIND} AS k, COUNT(*) AS c FROM work_items w WHERE ${is.where} GROUP BY k`,
    ...is.params,
  )) {
    const k = s(r, "k");
    if (k === "issue" || k === "branch" || k === "worktree" || k === "session") anchors[k] += n(r, "c");
    else anchors.other += n(r, "c");
  }

  const flagBase = `FROM flags f JOIN work_items w ON w.id = f.work_item_id
     WHERE f.cleared_at IS NULL AND f.dismissed = 0 AND ${is.where}`;
  const needsTotal = n(q1(`SELECT COUNT(DISTINCT w.id) AS c ${flagBase}`, ...is.params), "c");
  const needsRecent = n(
    q1(`SELECT COUNT(DISTINCT w.id) AS c ${flagBase} AND w.last_activity >= ?`, ...is.params, iso(48 * HOUR)),
    "c",
  );
  const kinds = ["forgotten", "thrashing", "unproven_claim"] as const;
  const byKind = kinds.map((kind) => ({ kind: kind as string, total: 0, recent48h: 0 }));
  const other = { kind: "other", total: 0, recent48h: 0 };
  const recentFrom = iso(48 * HOUR);
  for (const r of q(
    `SELECT f.kind AS k, COUNT(*) AS c, SUM(CASE WHEN w.last_activity >= ? THEN 1 ELSE 0 END) AS r ${flagBase} GROUP BY f.kind`,
    recentFrom,
    ...is.params,
  )) {
    const row = byKind.find((b) => b.kind === s(r, "k")) ?? other;
    row.total += n(r, "c");
    row.recent48h += n(r, "r");
  }
  if (other.total > 0) byKind.push(other);

  // Per-item session counts come from the `item_sessions` view (D86), when the store has it.
  const hasView =
    q1("SELECT 1 AS x FROM sqlite_master WHERE type = 'view' AND name = 'item_sessions'") !== undefined;
  const perItem = hasView
    ? q(
        `SELECT ${KIND} AS k, s.session_count AS sc, s.derived_count AS dc, s.subagent_count AS ac
           FROM item_sessions s JOIN work_items w ON w.item_key = s.item_key WHERE ${is.where}`,
        ...is.params,
      )
    : [];
  const hasBranches =
    q1("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'event_branches'") !== undefined;
  const payloadBranch = "json_extract(e.payload_json, '$.branch')";
  const sideBranch = hasBranches ? "b.branch" : "NULL";
  const br = q1(
    `SELECT COUNT(DISTINCT e.session_id) AS total,
            COUNT(DISTINCT CASE WHEN ${onBranch(payloadBranch)} THEN e.session_id END) AS before,
            COUNT(DISTINCT CASE WHEN ${onBranch(`COALESCE(${payloadBranch}, ${sideBranch})`)} THEN e.session_id END) AS after
       FROM events e ${hasBranches ? "LEFT JOIN event_branches b ON b.source = e.source AND b.source_id = e.source_id" : ""}
       WHERE e.session_id IS NOT NULL AND ${es.where}`,
    ...es.params,
  );
  const counts = perItem.map((r) => n(r, "sc")).toSorted((a, b) => a - b);
  const sessions = counts.reduce((a, b) => a + b, 0);
  const derived = perItem.reduce((a, r) => a + n(r, "dc"), 0);
  const subagents = perItem.reduce((a, r) => a + n(r, "ac"), 0);
  const provisional = perItem.filter((r) => s(r, "k") === "session").reduce((a, r) => a + n(r, "sc"), 0);
  const mid = counts.length >> 1;
  const median =
    counts.length === 0
      ? null
      : counts.length % 2 === 1
        ? (counts[mid] ?? 0)
        : ((counts[mid - 1] ?? 0) + (counts[mid] ?? 0)) / 2;

  const stages = { asked: 0, built: 0, proven: 0, other: 0 };
  for (const r of q(
    `SELECT w.stage AS st, COUNT(*) AS c FROM work_items w WHERE ${is.where} GROUP BY w.stage`,
    ...is.params,
  )) {
    const st = s(r, "st");
    if (st === "asked" || st === "built" || st === "proven") stages[st] += n(r, "c");
    else stages.other += n(r, "c");
  }
  // Docs-only items need no proof (D71), so they are left out. An item in Built has no fresh proof by
  // definition, so the useful numbers are how many edited items reached Proven and how many Built items
  // had a proof that expired, failed or never counted.
  const edited = count("w.stage IN ('built', 'proven') AND w.docs_only = 0");
  const provenCount = count("w.stage = 'proven' AND w.docs_only = 0");
  const builtCode = count("w.stage = 'built' AND w.docs_only = 0");
  const builtLost = count(
    "w.stage = 'built' AND w.docs_only = 0 AND w.proof_status IN ('expired', 'failed', 'weak')",
  );

  // Command families: classified one row at a time with the stage machine's own allowlist; only counts are kept.
  const fam = new Map<ProofFamily, number>();
  let cmdTotal = 0;
  let cmdUnrecognised = 0;
  const cmdRows = db
    .prepare(
      `SELECT json_extract(e.payload_json, '$.command') AS c FROM events e
         WHERE e.kind = 'command.ran' AND ${es.where}`,
    )
    .iterate(...es.params);
  for (const r of cmdRows) {
    const c = r["c"];
    if (typeof c !== "string") continue;
    cmdTotal++;
    const f = proofFamily(c);
    if (f === null) cmdUnrecognised++;
    else fam.set(f, (fam.get(f) ?? 0) + 1);
  }

  const bySource: { source: string; count: number }[] = [];
  let eventTotal = 0;
  for (const r of q(
    `SELECT e.source AS src, COUNT(*) AS c FROM events e WHERE ${es.where} GROUP BY e.source ORDER BY c DESC, src`,
    ...es.params,
  )) {
    const c = n(r, "c");
    eventTotal += c;
    const src = SAFE_WORD.test(s(r, "src")) ? s(r, "src") : "other";
    const prev = bySource.find((b) => b.source === src);
    if (prev) prev.count += c;
    else bySource.push({ source: src, count: c });
  }

  const lastPass = s(q1("SELECT MAX(updated_at) AS t FROM work_items") ?? {}, "t");
  const passMs = lastPass ? Date.parse(lastPass) : NaN;

  return {
    schema: 1,
    generatedAt: now.toISOString(),
    since: opts.since,
    repoFilter: opts.repo,
    items: {
      total,
      active24h: count("w.last_activity >= ?", iso(24 * HOUR)),
      active7d: count("w.last_activity >= ?", iso(7 * 24 * HOUR)),
      active30d: count("w.last_activity >= ?", iso(30 * 24 * HOUR)),
    },
    titles: { readable: total - fallback, fallback, readableShare: share(total - fallback, total) },
    anchors,
    needsYou: { total: needsTotal, recent48h: needsRecent, byKind },
    sessions: {
      total: sessions,
      derived: derived > 0 ? derived : null,
      derivedShare: derived > 0 ? share(derived, sessions) : null,
      perItemMedian: median,
      perItemMax: counts.length === 0 ? null : (counts.at(-1) ?? 0),
      multiSessionItems: counts.length === 0 ? null : counts.filter((c) => c > 1).length,
      subagentRuns: subagents > 0 ? subagents : null,
      anchored: sessions - provisional,
      provisional,
      anchoredShare: share(sessions - provisional, sessions),
      branch: {
        sessions: n(br, "total"),
        before: n(br, "before"),
        after: n(br, "after"),
        beforeShare: share(n(br, "before"), n(br, "total")),
        afterShare: share(n(br, "after"), n(br, "total")),
      },
    },
    stages,
    proven: { count: provenCount, of: edited, share: share(provenCount, edited) },
    builtProofLost: { count: builtLost, of: builtCode, share: share(builtLost, builtCode) },
    commands: {
      total: cmdTotal,
      recognised: [...fam]
        .map(([family, n2]) => ({ family, count: n2 }))
        .toSorted((a, b) => b.count - a.count || a.family.localeCompare(b.family)),
      notRecognised: cmdUnrecognised,
    },
    events: { total: eventTotal, bySource: bySource.slice(0, 8) },
    db: { sizeBytes: dbSizeBytes },
    stagePass: {
      lastAt: lastPass || null,
      ageSeconds: Number.isNaN(passMs) ? null : Math.max(0, Math.round((now.getTime() - passMs) / 1000)),
    },
    days: perDay(db, opts, now),
  };
}

/** One row per UTC day, oldest first, ending today. */
function perDay(db: DatabaseSync, opts: StatsOptions, now: Date): DayRow[] {
  const q = (sql: string, ...params: Param[]): Row[] => db.prepare(sql).all(...params);
  const days: DayRow[] = [];
  for (let i = opts.days - 1; i >= 0; i--) {
    days.push({
      day: utcDay(new Date(now.getTime() - i * 24 * HOUR)),
      active: 0,
      created: 0,
      titled: 0,
      events: 0,
      flagsRaised: 0,
      reachedProven: 0,
    });
  }
  const from = `${days[0]?.day ?? utcDay(now)}T00:00:00`;
  const byDay = new Map(days.map((d) => [d.day, d]));
  const is = itemScope(opts);
  const es = eventScope(opts);

  for (const r of q(
    `SELECT substr(w.first_activity, 1, 10) AS d, COUNT(*) AS c FROM work_items w
       WHERE ${is.where} AND w.first_activity >= ? GROUP BY d`,
    ...is.params,
    from,
  )) {
    const row = byDay.get(s(r, "d"));
    if (row) row.created = n(r, "c");
  }
  for (const r of q(
    `SELECT substr(e.occurred_at, 1, 10) AS d, COUNT(DISTINCT l.item_key) AS a,
            COUNT(DISTINCT CASE WHEN NOT ${UNTITLED} THEN l.item_key END) AS t
       FROM links l JOIN events e ON e.id = l.event_id JOIN work_items w ON w.item_key = l.item_key
       WHERE l.undone_at IS NULL AND ${is.where} AND e.occurred_at >= ? GROUP BY d`,
    ...is.params,
    from,
  )) {
    const row = byDay.get(s(r, "d"));
    if (row) {
      row.active = n(r, "a");
      row.titled = n(r, "t");
    }
  }
  for (const r of q(
    `SELECT substr(e.occurred_at, 1, 10) AS d, COUNT(*) AS c FROM events e
       WHERE ${es.where} AND e.occurred_at >= ? GROUP BY d`,
    ...es.params,
    from,
  )) {
    const row = byDay.get(s(r, "d"));
    if (row) row.events = n(r, "c");
  }
  for (const r of q(
    `SELECT substr(f.raised_at, 1, 10) AS d, COUNT(*) AS c FROM flags f JOIN work_items w ON w.id = f.work_item_id
       WHERE ${is.where} AND f.raised_at >= ? GROUP BY d`,
    ...is.params,
    from,
  )) {
    const row = byDay.get(s(r, "d"));
    if (row) row.flagsRaised = n(r, "c");
  }
  for (const r of q(
    `SELECT substr(c.at, 1, 10) AS d, COUNT(*) AS k FROM stage_changes c JOIN work_items w ON w.id = c.work_item_id
       WHERE ${is.where} AND c.to_stage = 'proven' AND c.at >= ? GROUP BY d`,
    ...is.params,
    from,
  )) {
    const row = byDay.get(s(r, "d"));
    if (row) row.reachedProven = n(r, "k");
  }
  return days;
}

// ---- goals ---------------------------------------------------------------------------------------

export type Verdict = "good" | "warn" | "bad" | null;

/** Starting-point goals, not product rules. `good` is the goal; past `bad` the number is clearly off. */
export const GOALS = {
  needsYouTotal: { good: 10, bad: 30 },
  needsYouRecent: { good: 5, bad: 15 },
  readableShare: { good: 0.8, bad: 0.5 },
  provenShare: { good: 0.5, bad: 0.2 },
  anchoredSessionShare: { good: 0.7, bad: 0.4 },
  stagePassAgeSeconds: { good: 5 * 60, bad: 30 * 60 },
  dbBytes: { good: 500 * 1024 * 1024, bad: 1024 * 1024 * 1024 },
} as const;

/** Lower is better. At or under `good` passes; over `bad` fails. */
const lowIsGood = (v: number | null, g: { good: number; bad: number }, strict = false): Verdict =>
  v === null ? null : (strict ? v < g.good : v <= g.good) ? "good" : v > g.bad ? "bad" : "warn";
const highIsGood = (v: number | null, g: { good: number; bad: number }): Verdict =>
  v === null ? null : v >= g.good ? "good" : v < g.bad ? "bad" : "warn";

const SYMBOL: Record<Exclude<Verdict, null>, string> = { good: "✅", warn: "⚠️", bad: "❌" };

// ---- rendering -----------------------------------------------------------------------------------

const pct = (v: number | null): string => (v === null ? "n/a" : `${Math.round(v * 100)}%`);
const mb = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const age = (sec: number | null): string => {
  if (sec === null) return "never";
  if (sec < 90) return `${sec} s`;
  if (sec < 5400) return `${Math.round(sec / 60)} min`;
  if (sec < 172_800) return `${Math.round(sec / 3600)} h`;
  return `${Math.round(sec / 86_400)} d`;
};

interface Line {
  verdict: Verdict;
  label: string;
  value: string;
  goal: string;
  meaning: string;
}

const KIND_MEANING: Record<string, string> = {
  forgotten: "idle over 5 days; being moved out of Needs you in the API, so expect this to drop",
  thrashing: "an agent looping on failing edits or checks",
  unproven_claim: "an agent stopped after code edits with no passing check",
  other: "flags of another kind",
};

/** Needs you split by flag kind, each with its total and its last-48-hour count. */
function kindLines(st: Stats): Line[] {
  return st.needsYou.byKind
    .filter((k) => k.total > 0)
    .map((k) => ({
      verdict: null,
      label: `Needs you: ${k.kind}`,
      value: `${k.total} (${k.recent48h} in 48 h)`,
      goal: "",
      meaning: KIND_MEANING[k.kind] ?? "",
    }));
}

/** Lineage lines, only when the store has sessions (and derived or sub-agent runs, when it has those). */
function sessionLines(st: Stats): Line[] {
  const x = st.sessions;
  if (x.total === 0) return [];
  const out: Line[] = [
    {
      verdict: highIsGood(x.anchoredShare, GOALS.anchoredSessionShare),
      label: "Sessions anchored",
      value: pct(x.anchoredShare),
      goal: `>= ${pct(GOALS.anchoredSessionShare.good)}`,
      meaning: "sessions on an issue, branch or worktree item, not a provisional per-session item",
    },
    {
      verdict: null,
      label: "Sessions on a branch, before",
      value: pct(x.branch.beforeShare),
      goal: "",
      meaning: "sessions with a non-default branch in the stored event itself",
    },
    {
      verdict: null,
      label: "Sessions on a branch, after",
      value: pct(x.branch.afterShare),
      goal: "",
      meaning: "same, also using the branch read from the transcript (D92); the gap is what that fix added",
    },
    {
      verdict: null,
      label: "Sessions",
      value: String(x.total),
      goal: "",
      meaning: "sessions linked to items in scope",
    },
    {
      verdict: null,
      label: "Sessions per item",
      value: `${x.perItemMedian ?? 0} / ${x.perItemMax ?? 0}`,
      goal: "",
      meaning: "median / most sessions on one item",
    },
    {
      verdict: null,
      label: "Items, 2+ sessions",
      value: String(x.multiSessionItems ?? 0),
      goal: "",
      meaning: "items that gathered more than one session",
    },
  ];
  if (x.derivedShare !== null)
    out.push({
      verdict: null,
      label: "Sessions derived",
      value: `${x.derived ?? 0} (${pct(x.derivedShare)})`,
      goal: "",
      meaning: "sessions that continue or branch from a parent session",
    });
  if (x.subagentRuns !== null)
    out.push({
      verdict: null,
      label: "Sub-agent runs",
      value: String(x.subagentRuns),
      goal: "",
      meaning: "distinct sub-agent runs inside those sessions",
    });
  return out;
}

function lines(st: Stats): Line[] {
  const g = GOALS;
  return [
    {
      verdict: null,
      label: "Items",
      value: String(st.items.total),
      goal: "",
      meaning: "work items in scope",
    },
    {
      verdict: null,
      label: "Active last 24 h",
      value: String(st.items.active24h),
      goal: "",
      meaning: "items with an event in the last day",
    },
    {
      verdict: null,
      label: "Active last 7 d",
      value: String(st.items.active7d),
      goal: "",
      meaning: "items with an event in the last week",
    },
    {
      verdict: null,
      label: "Active last 30 d",
      value: String(st.items.active30d),
      goal: "",
      meaning: "items with an event in the last month",
    },
    {
      verdict: lowIsGood(st.needsYou.total, g.needsYouTotal, true),
      label: "Needs you, total",
      value: String(st.needsYou.total),
      goal: `< ${g.needsYouTotal.good}`,
      meaning: "items with an open, undismissed flag",
    },
    {
      verdict: lowIsGood(st.needsYou.recent48h, g.needsYouRecent, true),
      label: "Needs you, last 48 h",
      value: String(st.needsYou.recent48h),
      goal: `< ${g.needsYouRecent.good}`,
      meaning: "flagged items that also had activity in 2 days",
    },
    {
      verdict: highIsGood(st.titles.readableShare, g.readableShare),
      label: "Readable titles",
      value: pct(st.titles.readableShare),
      goal: `>= ${pct(g.readableShare.good)}`,
      meaning: "items you can recognise, not a bare Session fallback",
    },
    ...kindLines(st),
    {
      verdict: highIsGood(st.proven.share, g.provenShare),
      label: "Edited items Proven",
      value: `${st.proven.count} of ${st.proven.of} (${pct(st.proven.share)})`,
      goal: `>= ${pct(g.provenShare.good)}`,
      meaning: "items with a code edit (docs-only excluded) that reached Proven",
    },
    {
      verdict: null,
      label: "Built, proof lost",
      value: `${st.builtProofLost.count} of ${st.builtProofLost.of}`,
      goal: "",
      meaning: "Built items whose last proof expired, failed or was weak",
    },
    ...sessionLines(st),
    {
      verdict: lowIsGood(st.stagePass.ageSeconds, g.stagePassAgeSeconds),
      label: "Last stage pass",
      value: age(st.stagePass.ageSeconds),
      goal: `<= ${age(g.stagePassAgeSeconds.good)}`,
      meaning: "how old the Track rows are (older means the daemon is not running)",
    },
    {
      verdict: lowIsGood(st.db.sizeBytes, g.dbBytes),
      label: "Database size",
      value: mb(st.db.sizeBytes),
      goal: `<= ${mb(g.dbBytes.good)}`,
      meaning: "disk used by the store",
    },
    {
      verdict: null,
      label: "Events",
      value: String(st.events.total),
      goal: "",
      meaning: "captured events in scope",
    },
  ];
}

const pad = (v: string, w: number): string => v.padEnd(w);

/** The text report. Fixed labels and numbers only. */
export function renderStats(st: Stats, trend: boolean): string[] {
  const out: string[] = [];
  const scope = [
    st.since ? `since ${st.since}` : "all time",
    ...(st.repoFilter === null ? [] : [`repo filter: ${st.repoFilter}`]),
  ].join(", ");
  out.push(`Vantage stats, ${scope}. Generated ${st.generatedAt}. Days are UTC.`);
  out.push("");
  if (!trend) {
    const ls = lines(st);
    const w = Math.max(...ls.map((l) => l.label.length));
    const vw = Math.max(...ls.map((l) => l.value.length));
    const gw = Math.max(...ls.map((l) => l.goal.length));
    for (const l of ls) {
      out.push(
        `${l.verdict ? SYMBOL[l.verdict] : "  "} ${pad(l.label, w)}  ${l.value.padStart(vw)}  ${pad(l.goal, gw)}  ${l.meaning}`,
      );
    }
    out.push("");
    out.push(
      `Anchors: issue ${st.anchors.issue}, branch ${st.anchors.branch}, worktree ${st.anchors.worktree}, session ${st.anchors.session}${st.anchors.other ? `, other ${st.anchors.other}` : ""}`,
    );
    out.push(
      `Stages: asked ${st.stages.asked}, built ${st.stages.built}, proven ${st.stages.proven}${st.stages.other ? `, other ${st.stages.other}` : ""}`,
    );
    out.push(
      `Checks run: ${st.commands.total} commands, ${st.commands.recognised.length === 0 ? "none recognised" : st.commands.recognised.map((f) => `${f.family} ${f.count}`).join(", ")}; ran but not recognised as a check: ${st.commands.notRecognised}`,
    );
    out.push(
      `Events by source: ${st.events.bySource.length === 0 ? "none" : st.events.bySource.map((b) => `${b.source} ${b.count}`).join(", ")}`,
    );
    out.push("");
  }
  out.push(`Per day, last ${st.days.length} days:`);
  const head = ["day", "active", "new", "titled", "events", "flags", "proven"];
  const rows = st.days.map((d) =>
    [d.day, d.active, d.created, d.titled, d.events, d.flagsRaised, d.reachedProven].map(String),
  );
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]?.length ?? 0)));
  out.push(head.map((h, i) => (i === 0 ? pad(h, widths[i] ?? 0) : h.padStart(widths[i] ?? 0))).join("  "));
  for (const r of rows)
    out.push(r.map((c, i) => (i === 0 ? pad(c, widths[i] ?? 0) : c.padStart(widths[i] ?? 0))).join("  "));
  out.push("");
  out.push(
    "active: items with an event that day. new: items first seen that day. titled: active items with a readable title.",
  );
  out.push("flags: flags raised that day. proven: items that reached Proven that day.");
  out.push("Goals are starting points you can change, not product rules.");
  return out;
}

// ---- command -------------------------------------------------------------------------------------

export interface StatsIo {
  out(line: string): void;
  err(line: string): void;
  env: NodeJS.ProcessEnv;
}

const USAGE = "Usage: vantage stats [--json] [--since 24h|7d|YYYY-MM-DD] [--repo NAME] [--days N]";

/** `--since` as an ISO timestamp, or null when the text is not a window. */
export function parseSince(v: string, now: Date): string | null {
  const rel = /^(\d{1,4})([hd])$/.exec(v);
  if (rel)
    return new Date(now.getTime() - Number(rel[1]) * (rel[2] === "h" ? HOUR : 24 * HOUR)).toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const t = Date.parse(`${v}T00:00:00Z`);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return null;
}

export function runStats(args: string[], io: StatsIo, now = new Date()): number {
  const opts: StatsOptions = { since: null, repo: null, days: 14 };
  let json = false;
  let trend = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const v = args[i + 1];
    if (a === "--json") json = true;
    else if (a === "--since" && v !== undefined) {
      const since = parseSince(v, now);
      if (since === null) {
        io.err(`Not a valid --since: use 24h, 7d or YYYY-MM-DD.`);
        return 2;
      }
      opts.since = since;
      i++;
    } else if (a === "--repo" && v !== undefined && v !== "" && !v.startsWith("--")) {
      opts.repo = v;
      i++;
    } else if (a === "--days" && v !== undefined) {
      const d = Number(v);
      if (!Number.isInteger(d) || d < 1 || d > 365) {
        io.err("Not a valid --days: use a whole number from 1 to 365.");
        return 2;
      }
      opts.days = d;
      trend = true;
      i++;
    } else {
      io.err(USAGE);
      return 2;
    }
  }

  const path = join(vantageHomeDir(io.env), "vantage.db");
  if (!existsSync(path)) {
    io.err("No database yet. Run `vantage start` once, then use Claude Code for a while.");
    return 1;
  }
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(path, { readOnly: true });
    db.exec("PRAGMA busy_timeout = 2000");
    let size = statSync(path).size;
    for (const ext of ["-wal"]) if (existsSync(path + ext)) size += statSync(path + ext).size;
    const st = computeStats(db, opts, now, size);
    if (json) io.out(JSON.stringify(st, null, 2));
    else for (const l of renderStats(st, trend)) io.out(l);
    return 0;
  } catch (e) {
    io.err(
      `Could not read the store (${e instanceof Error ? e.message.slice(0, 80) : "error"}). Is it a Vantage database?`,
    );
    return 1;
  } finally {
    db?.close();
  }
}
