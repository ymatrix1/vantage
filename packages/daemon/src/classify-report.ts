// Read-only agreement report (docs/specs/classify.md#evaluation): how often the classifier agrees with the
// deterministic anchors (branch, issue key, session lineage), by kind and confidence band. Aggregates only:
// no titles, no item keys, no repo names, no paths.
import type { ReadStore as Store } from "./classify-store.ts";

export const BANDS = ["<0.5", "0.5-0.8", ">=0.8"] as const;
export type Band = (typeof BANDS)[number];
export const bandOf = (c: number): Band => (c < 0.5 ? "<0.5" : c < 0.8 ? "0.5-0.8" : ">=0.8");

/** What the deterministic anchors say about a suggestion. */
export type Verdict = "agree" | "disagree" | "no_anchor";

export interface ReportCell {
  kind: "title" | "topic" | "group";
  band: Band;
  total: number;
  accepted: number;
  dismissed: number;
  open: number;
  agree: number;
  disagree: number;
  noAnchor: number;
  /** agree / (agree + disagree); null when no suggestion in the cell had an anchor. */
  agreementRate: number | null;
  /** accepted / (accepted + dismissed); null when none was decided. */
  acceptRate: number | null;
}

export interface ClassifyReport {
  total: number;
  cells: ReportCell[];
}

type Row = Record<string, unknown>;
const s = (r: Row | undefined, c: string): string => (r && typeof r[c] === "string" ? r[c] : "");
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isKind = (v: string): v is ReportCell["kind"] => v === "title" || v === "topic" || v === "group";

/** `feat/x` style prefix to a kind; null when the branch says nothing. */
function branchKind(branch: string): string | null {
  const p =
    /^(?:[^/]+\/)?(feat|feature|fix|bugfix|hotfix|docs?|refactor|research|spike|chore|ci|build|test)[/-]/i
      .exec(branch)?.[1]
      ?.toLowerCase();
  if (!p) return null;
  if (p === "feat" || p === "feature") return "feature";
  if (p === "fix" || p === "bugfix" || p === "hotfix") return "bugfix";
  if (p === "doc" || p === "docs") return "docs";
  if (p === "research" || p === "spike") return "research";
  if (p === "refactor") return "refactor";
  return "chore";
}

const anchorOf = (key: string): { kind: "issue" | "branch" | "other"; value: string } => {
  if (key.startsWith("issue:")) return { kind: "issue", value: key.slice(6).toUpperCase() };
  if (key.startsWith("branch:")) {
    const rest = key.slice(7);
    return { kind: "branch", value: rest.slice(rest.indexOf(":") + 1) };
  }
  return { kind: "other", value: key };
};

function sessionsOf(store: Store, key: string): string[] {
  return store.db
    .prepare(
      "SELECT DISTINCT e.session_id AS sid FROM links l JOIN events e ON e.id = l.event_id WHERE l.item_key = ? AND l.method != 'inferred' AND e.session_id IS NOT NULL",
    )
    .all(key)
    .map((r) => s(r, "sid"));
}

function lineageLinked(store: Store, a: string, b: string): boolean {
  const sa = new Set(sessionsOf(store, a));
  const sb = new Set(sessionsOf(store, b));
  if (sa.size === 0 || sb.size === 0) return false;
  const parents = store.db
    .prepare(
      "SELECT session_id AS sid, json_extract(payload_json, '$.parentSessionId') AS parent FROM events WHERE kind = 'session.derived'",
    )
    .all();
  return parents.some(
    (r) => (sa.has(s(r, "sid")) && sb.has(s(r, "parent"))) || (sb.has(s(r, "sid")) && sa.has(s(r, "parent"))),
  );
}

/** Group: same issue key or same branch name or a lineage path is agreement; two different anchors is disagreement. */
function groupVerdict(store: Store, a: string, b: string): Verdict {
  const x = anchorOf(a);
  const y = anchorOf(b);
  if (lineageLinked(store, a, b)) return "agree";
  if (x.kind === "other" || y.kind === "other") return "no_anchor";
  return x.kind === y.kind && x.value === y.value ? "agree" : "disagree";
}

/** Topic kind against the branch prefix. Title has no deterministic anchor to compare with. */
function topicVerdict(store: Store, itemKey: string, kind: string): Verdict {
  const w = store.db.prepare("SELECT branch FROM work_items WHERE item_key = ?").get(itemKey);
  const bk = branchKind(
    s(w, "branch") || (anchorOf(itemKey).kind === "branch" ? anchorOf(itemKey).value : ""),
  );
  return bk === null ? "no_anchor" : bk === kind ? "agree" : "disagree";
}

export function classifyReport(store: Store): ClassifyReport {
  const cells = new Map<string, ReportCell>();
  let total = 0;
  for (const r of store.db
    .prepare(
      "SELECT item_key, kind, payload_json, confidence, status FROM suggestions WHERE status != 'undone'",
    )
    .all()) {
    const kind = s(r, "kind");
    if (!isKind(kind)) continue;
    let payload: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(s(r, "payload_json"));
      if (isRec(parsed)) payload = parsed;
    } catch {
      // zero payload
    }
    const verdict: Verdict =
      kind === "group"
        ? groupVerdict(store, s(r, "item_key"), str(payload["with"]))
        : kind === "topic"
          ? topicVerdict(store, s(r, "item_key"), str(payload["kind"]))
          : "no_anchor";
    const band = bandOf(Number(r["confidence"] ?? 0));
    const k = `${kind}|${band}`;
    const c: ReportCell = cells.get(k) ?? {
      kind,
      band,
      total: 0,
      accepted: 0,
      dismissed: 0,
      open: 0,
      agree: 0,
      disagree: 0,
      noAnchor: 0,
      agreementRate: null,
      acceptRate: null,
    };
    c.total++;
    total++;
    const st = s(r, "status");
    if (st === "accepted") c.accepted++;
    else if (st === "dismissed") c.dismissed++;
    else c.open++;
    if (verdict === "agree") c.agree++;
    else if (verdict === "disagree") c.disagree++;
    else c.noAnchor++;
    cells.set(k, c);
  }
  const out = [...cells.values()].toSorted(
    (a, b) => a.kind.localeCompare(b.kind) || BANDS.indexOf(a.band) - BANDS.indexOf(b.band),
  );
  for (const c of out) {
    c.agreementRate = c.agree + c.disagree > 0 ? c.agree / (c.agree + c.disagree) : null;
    c.acceptRate = c.accepted + c.dismissed > 0 ? c.accepted / (c.accepted + c.dismissed) : null;
  }
  return { total, cells: out };
}

const pct = (v: number | null): string => (v === null ? "n/a" : `${Math.round(v * 100)}%`);

/** Aligned text lines for `vantage classify report` and the stats section. */
export function renderReport(r: ClassifyReport): string[] {
  if (r.total === 0) return ["No classifier suggestions yet."];
  const out = ["kind    confidence  total  accepted  dismissed  agree  disagree  agreement  accept rate"];
  for (const c of r.cells) {
    out.push(
      `${c.kind.padEnd(7)} ${c.band.padEnd(11)} ${String(c.total).padStart(5)}  ${String(c.accepted).padStart(8)}  ${String(c.dismissed).padStart(9)}  ${String(c.agree).padStart(5)}  ${String(c.disagree).padStart(8)}  ${pct(c.agreementRate).padStart(9)}  ${pct(c.acceptRate).padStart(11)}`,
    );
  }
  return out;
}
