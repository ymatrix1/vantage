// L1: a repo group from the API becomes a project section, ordered by who needs you most.
import { projectNameOf } from "@vantage/core/track";
import type { GroupBy, TrackGroup, TrackRow } from "./contract";
import { repoLink } from "./links";

/** A heading plus its rows: a project (repo grouping) or any other API group. */
export interface Section {
  id: string;
  label: string;
  total: number;
  items: TrackRow[];
  /** Repo link, for projects with a known remote. */
  url: string | null;
  /** Counts over the rows on this page, which is all the page knows; null outside project sections. */
  needsYou: number | null;
  inProgress: number | null;
  lastActivity: string | null;
}

const flagged = (i: TrackRow): boolean => i.flags.length > 0;

/** `repo:<repo>` groups only; the repo is the remote path or, failing that, a folder name. */
export function projectOf(g: TrackGroup): Section {
  const repo = g.id.slice("repo:".length);
  const needsYou = g.items.filter(flagged).length;
  const last = g.items.reduce<string | null>(
    (m, i) => (m === null || i.lastActivity > m ? i.lastActivity : m),
    null,
  );
  return {
    id: g.id,
    label: projectNameOf(repo) ?? "No repo",
    total: g.total,
    // Rows that need you come first inside a project; the order is otherwise the API's.
    items: [...g.items.filter(flagged), ...g.items.filter((i) => !flagged(i))],
    url: repoLink(repo),
    needsYou,
    inProgress: g.items.length - needsYou,
    lastActivity: last,
  };
}

const plain = (g: TrackGroup): Section => ({
  id: g.id,
  label: g.label,
  total: g.total,
  items: g.items,
  url: null,
  needsYou: null,
  inProgress: null,
  lastActivity: null,
});

/**
 * Sections in display order. Repo grouping makes projects: most "needs you" first, then most recently
 * active, a repo-less group last; groups the page built itself (no code, older) follow. Other groupings
 * keep the API's order.
 */
export function sectionsOf(mode: GroupBy, groups: readonly TrackGroup[]): Section[] {
  if (mode !== "repo") return groups.map(plain);
  const projects = groups.filter((g) => g.id.startsWith("repo:")).map(projectOf);
  const ordered = projects
    .map((p, i) => ({ p, i }))
    .toSorted(
      (a, b) =>
        Number(a.p.label === "No repo") - Number(b.p.label === "No repo") ||
        (b.p.needsYou ?? 0) - (a.p.needsYou ?? 0) ||
        (b.p.lastActivity ?? "").localeCompare(a.p.lastActivity ?? "") ||
        a.i - b.i,
    )
    .map((x) => x.p);
  return [...ordered, ...groups.filter((g) => !g.id.startsWith("repo:")).map(plain)];
}
