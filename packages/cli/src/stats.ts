// `vantage stats`: how useful is the Track page? Read-only aggregates from the local store.
// Output holds numbers and fixed labels only: no titles, commands, paths or repo names, so it is safe to
// paste into an issue (privacy boundary). The one echo is the `--repo` text the user typed.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
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
  needsYou: { total: number; recent48h: number; topFlags: { kind: string; count: number }[] };
  sessions: { total: number; derived: number | null; derivedShare: number | null };
  stages: { asked: number; built: number; proven: number; other: number };
  builtNoFreshProof: { count: number; of: number; share: number | null };
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

const KIND = "substr(w.item_key, 1, instr(w.item_key, ':') - 1)";
/** A fallback title: a session item whose title is the stage pass placeholder (or empty), not a real name. */
const UNTITLED = "(w.item_key LIKE 'session:%' AND (w.title = '' OR w.title LIKE 'Session %'))";

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
  const topFlags = q(
    `SELECT f.kind AS k, COUNT(*) AS c ${flagBase} GROUP BY f.kind ORDER BY c DESC, k LIMIT 5`,
    ...is.params,
  ).map((r) => ({ kind: SAFE_WORD.test(s(r, "k")) ? s(r, "k") : "other", count: n(r, "c") }));

  const sessions = anchors.session;
  const derived = count("w.item_key LIKE 'session:%' AND w.parent_id IS NOT NULL");

  const stages = { asked: 0, built: 0, proven: 0, other: 0 };
  for (const r of q(
    `SELECT w.stage AS st, COUNT(*) AS c FROM work_items w WHERE ${is.where} GROUP BY w.stage`,
    ...is.params,
  )) {
    const st = s(r, "st");
    if (st === "asked" || st === "built" || st === "proven") stages[st] += n(r, "c");
    else stages.other += n(r, "c");
  }
  // Docs-only items need no proof (D71), so they are left out of both sides of the share.
  const builtScored = count("w.stage = 'built' AND w.proof_status != 'not_required'");
  const builtNoProof = count("w.stage = 'built' AND w.proof_status NOT IN ('fresh', 'not_required')");

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
    needsYou: { total: needsTotal, recent48h: needsRecent, topFlags },
    sessions: {
      total: sessions,
      derived: derived > 0 ? derived : null,
      derivedShare: derived > 0 ? share(derived, sessions) : null,
    },
    stages,
    builtNoFreshProof: { count: builtNoProof, of: builtScored, share: share(builtNoProof, builtScored) },
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
  builtNoProofShare: { good: 0.3, bad: 0.6 },
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
    {
      verdict: lowIsGood(st.builtNoFreshProof.share, g.builtNoProofShare),
      label: "Built, no fresh proof",
      value: pct(st.builtNoFreshProof.share),
      goal: `<= ${pct(g.builtNoProofShare.good)}`,
      meaning: "Built items (docs-only excluded) with no passing check since the last edit",
    },
    ...(st.sessions.derivedShare === null
      ? []
      : [
          {
            verdict: null,
            label: "Sessions derived",
            value: pct(st.sessions.derivedShare),
            goal: "",
            meaning: "session items attached to a parent session",
          } satisfies Line,
        ]),
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
      `Top flags: ${st.needsYou.topFlags.length === 0 ? "none" : st.needsYou.topFlags.map((f) => `${f.kind} ${f.count}`).join(", ")}`,
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
