// "Conversations without code" and "Older" are built here from the page's own rows: the daemon groups by
// attention, repo or stage and marks each row's `hasEdits`, so the page folds what it should keep quiet.
import { NO_EDITS_GROUP, OLDER_GROUP, type TrackGroup, type TrackView } from "./contract";
import type { ViewState } from "./view";

export const OLDER_AFTER_MS = 7 * 86_400_000;

/**
 * Only when grouped by attention or by project. Rows with `hasEdits === false` go to "Conversations without code"
 * (its total is the filter-wide count from `facets.hasEdits`, so it is right across pages); with a
 * 30-day or all-time range, remaining rows older than 7 days go to "Older" (counted on this page only).
 * Other groups keep the daemon's totals, which still include the folded rows.
 */
export function foldGroups(view: ViewState, data: TrackView, now: Date): TrackGroup[] {
  const real = data.groups.filter((g) => g.total > 0 || g.items.length > 0);
  if (view.group !== "attention" && view.group !== "repo") return real;
  const fold = view.hasEdits === null;
  const olderOk = view.since === "30d" || view.since === "all";
  const cutoff = now.getTime() - OLDER_AFTER_MS;
  const quiet: TrackGroup["items"] = [];
  const old: TrackGroup["items"] = [];
  const kept = real.map((g) => ({
    ...g,
    items: g.items.filter((i) => {
      if (fold && i.hasEdits === false) {
        quiet.push(i);
        return false;
      }
      if (olderOk && Date.parse(i.lastActivity) < cutoff) {
        old.push(i);
        return false;
      }
      return true;
    }),
  }));
  const out: TrackGroup[] = kept.filter((g) => g.items.length > 0 || g.total > 0);
  if (quiet.length > 0) {
    out.push({
      id: NO_EDITS_GROUP,
      label: "Conversations without code",
      total: Math.max(data.facets.hasEdits.false, quiet.length),
      items: quiet,
    });
  }
  if (old.length > 0) out.push({ id: OLDER_GROUP, label: "Older", total: old.length, items: old });
  return out;
}
