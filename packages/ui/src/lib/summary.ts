// The one-line header (L0): counts for the current filters, from a `group=attention, pageSize=30` request.
import type { TrackRow, TrackView } from "./contract";

export interface Summary {
  inProgress: number;
  needsYou: number;
  unproven: number;
  stuck: number;
  forgotten: number;
  older: number;
  /** Top of the "needs you" and "in progress" groups, for the overview (how many: OVERVIEW_ITEMS). */
  needs: TrackRow[];
  progress: TrackRow[];
  /** Items per stage under the current filters. */
  stages: Record<string, number>;
}

export const OVERVIEW_ITEMS = 3;
const top = (v: TrackView, id: string): TrackRow[] =>
  v.groups.find((g) => g.id === id)?.items.slice(0, OVERVIEW_ITEMS) ?? [];

const total = (v: TrackView, id: string): number => v.groups.find((g) => g.id === id)?.total ?? 0;

export function summaryOf(v: TrackView): Summary {
  return {
    inProgress: total(v, "in_progress"),
    needsYou: total(v, "needs_you"),
    unproven: v.facets.flag["unproven_claim"] ?? 0,
    stuck: v.facets.flag["thrashing"] ?? 0,
    forgotten: v.facets.flag["forgotten"] ?? 0,
    older: v.facets.age.older,
    needs: top(v, "needs_you"),
    progress: top(v, "in_progress"),
    stages: v.facets.stage,
  };
}

/** "20 need you (12 unproven, 5 stuck)": the parenthesis only names flags that exist. */
export function needsYouDetail(s: Summary): string {
  const parts = [
    s.unproven > 0 ? `${s.unproven} unproven` : "",
    s.stuck > 0 ? `${s.stuck} stuck` : "",
    s.forgotten > 0 ? `${s.forgotten} forgotten` : "",
  ].filter(Boolean);
  return parts.join(", ");
}
