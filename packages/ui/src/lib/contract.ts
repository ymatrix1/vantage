// The `GET /api/track` contract comes from `@vantage/core/track` (D84); this file re-exports it under the
// names the page uses and holds the page-only constants.
import {
  FLAG_FILTERS,
  GROUP_KEYS,
  MAX_QUERY_CHARS,
  PROOF_STATES,
  SINCE_VALUES,
  SORT_KEYS,
  TRACK_STAGES,
  type GroupKey,
  type Since,
  type SortKey,
  type TrackFacets,
  type TrackItem,
  type TrackView as CoreTrackView,
} from "@vantage/core/track";

export { SINCE_VALUES, type Since };
export const SORT_VALUES = SORT_KEYS;
export const GROUP_VALUES = GROUP_KEYS;
export const PROOF_VALUES = PROOF_STATES;
export const FLAG_VALUES = FLAG_FILTERS;
export const STAGE_VALUES = TRACK_STAGES;
export const Q_MAX = MAX_QUERY_CHARS;
export const PAGE_SIZES = [25, 50, 100] as const;

export type Sort = SortKey;
export type GroupBy = GroupKey;
export type Order = "asc" | "desc";
export type Facets = TrackFacets;
export type PageInfo = CoreTrackView["page"];

/**
 * A row. `sessionCount` and `derivedCount` are optional: the daemon computes them
 * (`packages/daemon/src/lineage.ts`) but `/api/track` does not send them yet, so "N sessions" shows only when present.
 */
export type TrackRow = TrackItem & { sessionCount?: number; derivedCount?: number };
export type TrackGroup = Omit<CoreTrackView["groups"][number], "items"> & { items: TrackRow[] };
/** What the daemon sends for `GET /api/track`, with rows that may carry session counts. */
export type TrackView = Omit<CoreTrackView, "groups"> & { groups: TrackGroup[] };

/** Ids of the groups the page builds itself (the API folds no-code and old items into the normal groups). */
export const NO_EDITS_GROUP = "no_edits";
export const OLDER_GROUP = "older";
/** Group ids the page collapses until the user opens them. */
export const COLLAPSED_BY_DEFAULT: readonly string[] = [NO_EDITS_GROUP, OLDER_GROUP];
