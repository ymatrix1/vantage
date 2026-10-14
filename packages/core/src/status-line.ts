// Status line renderer (docs/specs/status-line.md). Pure: a summary and the session's width in,
// one line of text out. Shape carries the meaning; color is optional and never needed to read it.
import type { ProofStatus, Stage } from "./stage.ts";

export const STATUS_FILE = "status.json";
/** Older than this and the line says `stale` instead of guessing. */
export const STATUS_STALE_MS = 5 * 60_000;

export interface StatusItem {
  stage: Stage;
  proofStatus: ProofStatus;
  proofLevel: number;
  docsOnly: boolean;
  repo: string | null;
  title: string;
  /** Kinds of the open, undismissed flags. */
  flags: string[];
}

/** The small file the daemon rewrites; the status line command reads only this. */
export interface StatusSummary {
  v: 1;
  writtenAt: string;
  /** Items with an open flag, across all projects. */
  needsYou: number;
  /** Mentions waiting for a reply. No Phase 1 source yet, so 0. */
  pings: number;
  /** Item per Claude Code session id. */
  sessions: Record<string, StatusItem>;
}

export interface StatusInput {
  sessionId?: string;
  /** Repo name from the status line's stdin, used when the session has no item. */
  repo?: string;
  columns?: number;
  color?: boolean;
  quiet?: boolean;
  now?: Date;
}

const STAGES: readonly Stage[] = ["asked", "built", "proven"];
const PROOF_STATUSES: readonly ProofStatus[] = ["none", "fresh", "expired", "failed", "weak", "not_required"];
export const isStage = (v: unknown): v is Stage => STAGES.some((s) => s === v);
export const isProofStatus = (v: unknown): v is ProofStatus => PROOF_STATUSES.some((s) => s === v);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const SUPERSCRIPT = ["", "¹", "²", "³", "⁴"];
const ANSI: Record<string, string> = { green: "32", blue: "34", yellow: "33", red: "31", gray: "90" };
const SEP = " · ";

interface Glyph {
  text: string;
  color: keyof typeof ANSI;
}

const DONE: Glyph = { text: "●", color: "green" };
const ACTIVE: Glyph = { text: "◉", color: "blue" };
const NO_PROOF: Glyph = { text: "◐", color: "yellow" };
const NEEDS_YOU: Glyph = { text: "◍!", color: "red" };
const SKIPPED: Glyph = { text: "◌", color: "gray" };
const NOT_YET: Glyph = { text: "○", color: "gray" };

/** Six steps: Asked, Built, Proven, Reviewed, Shipped, Verified. Phase 1 knows the first three. */
export function trackGlyphs(item: StatusItem): Glyph[] {
  const slots: Glyph[] = [DONE, NOT_YET, NOT_YET, NOT_YET, NOT_YET, NOT_YET];
  const flagged = item.flags.length > 0;
  if (item.stage === "asked") {
    slots[1] = flagged ? NEEDS_YOU : ACTIVE;
  } else {
    slots[1] = DONE;
    if (flagged) slots[2] = NEEDS_YOU;
    else if (item.proofStatus === "not_required" || item.docsOnly) slots[2] = SKIPPED;
    else if (item.stage === "proven" && item.proofStatus === "fresh") {
      const digit = SUPERSCRIPT[item.proofLevel] ?? "";
      slots[2] = { text: `●${digit}`, color: "green" };
    } else slots[2] = NO_PROOF;
  }
  return slots;
}

const chars = (s: string): string[] => Array.from(s);
const width = (s: string): number => chars(s).length;

function paint(g: Glyph, color: boolean): string {
  return color ? `\u001b[${ANSI[g.color]}m${g.text}\u001b[0m` : g.text;
}

/** `feat/billing-checkout_fix` to `billing checkout fix`, at most 4 words. */
export function shortTitle(title: string): string {
  const slash = title.indexOf("/");
  const bare = slash >= 0 && slash < 8 ? title.slice(slash + 1) : title;
  return bare.replace(/[-_]+/g, " ").trim().split(/\s+/).slice(0, 4).join(" ");
}

function clip(s: string, max: number): string {
  const all = chars(s);
  if (all.length <= max) return s;
  return max <= 1 ? "…".slice(0, max) : all.slice(0, max - 1).join("") + "…";
}

/** Reads the summary file text; `null` for anything that isn't a version-1 summary. */
export function parseStatusSummary(text: string): StatusSummary | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;
  const r = raw;
  if (r["v"] !== 1 || typeof r["writtenAt"] !== "string") return null;
  const sessions: Record<string, StatusItem> = {};
  const rs = r["sessions"];
  if (isRecord(rs)) {
    for (const [id, i] of Object.entries(rs)) {
      if (!isRecord(i)) continue;
      const stage = i["stage"];
      if (!isStage(stage)) continue;
      const proofStatus = i["proofStatus"];
      sessions[id] = {
        stage,
        proofStatus: isProofStatus(proofStatus) ? proofStatus : "none",
        proofLevel: typeof i["proofLevel"] === "number" ? i["proofLevel"] : 0,
        docsOnly: i["docsOnly"] === true,
        repo: typeof i["repo"] === "string" ? i["repo"] : null,
        title: typeof i["title"] === "string" ? i["title"] : "",
        flags: Array.isArray(i["flags"]) ? i["flags"].filter((f) => typeof f === "string") : [],
      };
    }
  }
  const count = (k: string): number => (typeof r[k] === "number" && r[k] >= 0 ? Math.floor(r[k]) : 0);
  return { v: 1, writtenAt: r["writtenAt"], needsYou: count("needsYou"), pings: count("pings"), sessions };
}

/** One status line. `null` means no summary file (daemon never ran or is gone): a calm fallback. */
export function renderStatusLine(summary: StatusSummary | null, input: StatusInput = {}): string {
  const color = input.color ?? false;
  const cols = input.columns && input.columns > 0 ? input.columns : 80;
  if (!summary) return "vantage · offline";
  const age = (input.now ?? new Date()).getTime() - Date.parse(summary.writtenAt);
  if (!(age <= STATUS_STALE_MS)) return "vantage · stale"; // also catches an unparsable date

  const needs =
    summary.needsYou > 0
      ? color
        ? `\u001b[${ANSI["red"]}m${summary.needsYou} need you\u001b[0m`
        : `${summary.needsYou} need you`
      : null;
  const needsWidth = summary.needsYou > 0 ? width(`${summary.needsYou} need you`) : 0;
  if (input.quiet) return `vantage${SEP}${needs ?? "nothing needs you"}`;

  const item = input.sessionId ? summary.sessions[input.sessionId] : undefined;
  const repo = item?.repo ?? input.repo ?? "";
  const head = ["vantage", ...(repo ? [repo] : [])].join(SEP);
  const pings = summary.pings > 0 ? `${summary.pings} owe reply` : null;

  // Visible width of the pieces, ANSI codes excluded.
  const join = (parts: { s: string; w: number }[]): { s: string; w: number } => ({
    s: parts.map((p) => p.s).join(SEP),
    w: parts.reduce((n, p) => n + p.w, 0) + SEP.length * (parts.length - 1),
  });
  const headP = { s: head, w: width(head) };
  const needsP = needs ? { s: needs, w: needsWidth } : null;
  const pingsP = pings ? { s: pings, w: width(pings) } : null;
  const compact = [headP, ...(needsP ? [needsP] : [])];

  const fits = (parts: { s: string; w: number }[]): string | null => {
    const j = join(parts);
    return j.w <= cols ? j.s : null;
  };

  if (item && cols >= 50) {
    const glyphs = trackGlyphs(item);
    const track = glyphs.map((g) => paint(g, color)).join("");
    const trackW = glyphs.reduce((n, g) => n + width(g.text), 0);
    const title = shortTitle(item.title);
    const tail = [...(needsP ? [needsP] : []), ...(pingsP ? [pingsP] : [])];
    const withTitle = (t: string): { s: string; w: number } =>
      t ? { s: `${track} ${t}`, w: trackW + 1 + width(t) } : { s: track, w: trackW };
    const full = fits([headP, withTitle(title), ...tail]);
    if (full) return full;
    // Drop from the right: pings first, then shorten the title, then drop it.
    const noPings = tail.filter((p) => p !== pingsP);
    const base = join([headP, ...noPings]).w + SEP.length;
    const room = cols - base - trackW - 1;
    if (room >= 6) return join([headP, withTitle(clip(title, room)), ...noPings]).s;
    const bare = fits([headP, withTitle(""), ...noPings]);
    if (bare) return bare;
  }
  const small = fits(compact);
  if (small) return small;
  const bareHead = fits([headP]);
  if (bareHead) return bareHead;
  return clip(head, cols);
}
