// Track page view rules shared by the daemon API and the UI: attention grouping and the six-dot
// track (docs/UX.md#track, docs/specs/visual-language.md). Pure; no I/O.

export const TRACK_STAGES = ["asked", "built", "proven", "reviewed", "shipped", "verified"] as const;
export type TrackStage = (typeof TRACK_STAGES)[number];

/** Stages the Phase 1 sources can evidence; the rest stay hollow until their sources exist. */
export const PHASE1_STAGES: readonly TrackStage[] = ["asked", "built", "proven"];

export type Attention = "needs_you" | "in_progress" | "waiting" | "done";
export const ATTENTION_ORDER: readonly Attention[] = ["needs_you", "in_progress", "waiting", "done"];
export const ATTENTION_LABEL: Record<Attention, string> = {
  needs_you: "Needs you",
  in_progress: "In progress",
  waiting: "Waiting on others",
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
  lastActivity: string;
}

/** Any open flag means the item needs a look; Phase 1 has no source for "waiting" or "done". */
export function attentionOf(item: { stage: string; flags: readonly { severity: string }[] }): Attention {
  if (item.flags.length > 0) return "needs_you";
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

export interface TrackResponse {
  generatedAt: string;
  /** When the derived tables were last rebuilt; null before the first pass. */
  lastPassAt: string | null;
  /** True when the last pass is older than STALE_PASS_MS: rows may lag the evidence. */
  stale: boolean;
  groups: { attention: Attention; label: string; items: TrackItem[] }[];
  sources: SourceHealth[];
}

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
