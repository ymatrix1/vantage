// Mirror of the `GET /api/track` contract from the API session (bean for packages/core/src/track.ts).
// Swap this file for `@vantage/core/track` imports once that PR merges; keep the names identical.
import type { SourceHealth, TrackItem } from "@vantage/core/track";

export const SINCE_VALUES = ["24h", "7d", "30d", "all"] as const;
export const SORT_VALUES = ["activity", "stage", "title", "repo", "flags"] as const;
export const GROUP_VALUES = ["attention", "repo", "stage", "none"] as const;
export const PROOF_VALUES = ["none", "fresh", "expired", "failed", "weak", "not_required"] as const;
export const FLAG_VALUES = ["thrashing", "unproven_claim", "forgotten", "none"] as const;
export const STAGE_VALUES = ["asked", "built", "proven", "reviewed", "shipped", "verified"] as const;
export const PAGE_SIZES = [25, 50, 100] as const;
export const Q_MAX = 80;

export type Since = (typeof SINCE_VALUES)[number];
export type Sort = (typeof SORT_VALUES)[number];
export type GroupBy = (typeof GROUP_VALUES)[number];
export type Order = "asc" | "desc";

/** A row: the existing item plus whether any code edit was seen (false = a conversation without code). */
export type TrackRow = TrackItem & { hasEdits: boolean };

export interface TrackGroup {
  id: string;
  label: string;
  /** Items in this group across all pages; `items` holds only the current page's share. */
  total: number;
  items: TrackRow[];
}

type Counts = Record<string, number>;
/** Each dimension is counted over the set filtered by everything except itself. */
export interface Facets {
  repo: Counts;
  branch: Counts;
  stage: Counts;
  proof: Counts;
  flag: Counts;
  age: { today: number; week: number; older: number };
  hasEdits: { true: number; false: number };
}

export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface TrackView {
  generatedAt: string;
  lastPassAt: string | null;
  stale: boolean;
  sources: SourceHealth[];
  page: PageInfo;
  facets: Facets;
  groups: TrackGroup[];
}

/** Group ids the page collapses until the user opens them. */
export const COLLAPSED_BY_DEFAULT: readonly string[] = ["no_edits", "older"];
