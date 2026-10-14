// Deterministic linker: attaches events to work items by anchor (docs/specs/work-item-model.md).
// Pure and replayable: the same events and options always give the same links. Inferred links are
// out of scope (Q25); every link here has method "anchor" and records the rule that made it.
import type { VantageEvent } from "./events.ts";
import { rootSession, sessionLineage } from "./lineage.ts";

export type LinkAnchorKind = "issue_key" | "branch" | "worktree" | "session";

/** Why an event was linked, so the item view can explain and undo it. */
export type LinkRule =
  | "issue-key-branch" // key named in the event's branch (D25 rules 1 and 3)
  | "issue-key-text" // key named in the event's own text, among several on the branch (rule 3)
  | "branch" // non-default branch with no key (rule 2)
  | "worktree" // linked worktree with no branch, e.g. detached HEAD (rule 2)
  | "provisional-session" // default branch, no key, session with edits (rule 4)
  | "derived-session"; // derived session with no anchor of its own: joins its parent's item (D86)

export interface Link {
  /** `source` and `sourceId` of the linked event. */
  eventSource: string;
  eventSourceId: string;
  /** Stable key of the work item, e.g. `issue:FTK-1234`, `branch:<repo>:feat/x`. */
  itemKey: string;
  method: "anchor";
  anchor: { kind: LinkAnchorKind; value: string };
  rule: LinkRule;
  confidence: 1;
}

export type UnlinkedReason =
  | "no-anchor" // default branch or unknown context, and no edits in the session
  | "undone"; // the user removed this link

export interface Unlinked {
  eventSource: string;
  eventSourceId: string;
  reason: UnlinkedReason;
}

export interface LinkOptions {
  /** Default branch names; `main` and `master` when absent. */
  defaultBranches?: readonly string[];
  /** Paths of main checkouts. Any other worktree seen in git events is a linked worktree. */
  mainWorktrees?: readonly string[];
  /** Restricts issue keys to these project prefixes (e.g. FTK, ENG). Any key shape when absent. */
  projectKeys?: readonly string[];
  /** Links the user undid (see `undoKey`); they are never re-created. */
  undone?: ReadonlySet<string>;
  /** Repo identity prefixed to branch items so same-named branches in two repos stay apart. */
  repo?: string;
}

export interface LinkResult {
  links: Link[];
  unlinked: Unlinked[];
}

export const undoKey = (eventSource: string, eventSourceId: string, itemKey: string): string =>
  `${eventSource}|${eventSourceId}|${itemKey}`;

const DEFAULT_BRANCHES = ["main", "master"];
// Not trackers: encodings and standards that look like KEY-123.
const NOT_KEYS = new Set(["UTF", "ISO", "SHA", "MD", "CVE", "RFC", "PEP", "X", "ES", "HTTP"]);
const KEY_RE = /(?<![A-Za-z0-9])([A-Za-z][A-Za-z0-9]{1,9})-(\d{1,7})(?![A-Za-z0-9])/g;

/**
 * Issue keys in `text`, in order of appearance, upper-cased and de-duplicated. Linear's suggested
 * branch names (user/eng-123-title) match too, so matching ignores case.
 */
export function extractIssueKeys(text: string, projectKeys?: readonly string[]): string[] {
  const allow = projectKeys ? new Set(projectKeys.map((k) => k.toUpperCase())) : null;
  const keys: string[] = [];
  for (const m of text.matchAll(KEY_RE)) {
    const prefix = (m[1] ?? "").toUpperCase();
    if (allow ? !allow.has(prefix) : NOT_KEYS.has(prefix)) continue;
    const key = `${prefix}-${Number(m[2])}`;
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

const norm = (p: string): string => p.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

/** Worktree path an event happened in, and the branch it carries itself, if any. */
function ownContext(e: VantageEvent): { path?: string; branch?: string | null } {
  const p = e.payload;
  const path = str(p["worktree"]) ?? str(p["cwd"]);
  const base = path ? { path } : {};
  if (e.kind === "branch.checked_out") return { ...base, branch: str(p["to"]) ?? null };
  if ("branch" in p) return { ...base, branch: str(p["branch"]) ?? null };
  return base;
}

/** Text in an event that can name a key: commit subject, PR title, command line. */
function eventText(e: VantageEvent): string {
  const p = e.payload;
  return [p["subject"], p["title"], p["command"]]
    .map(str)
    .filter((s) => s !== undefined)
    .join("\n");
}

interface Placed {
  event: VantageEvent;
  branch: string | null;
  path: string | undefined;
  /** True when the event or a prior git event told us the branch state (null means detached). */
  known: boolean;
}

/** Resolves each event's branch at event time (D54) by replaying git state in time order. */
function place(events: readonly VantageEvent[]): { placed: Placed[]; gitWorktrees: Set<string> } {
  const sorted = events
    .map((event, i) => ({ event, i }))
    .toSorted((a, b) => Date.parse(a.event.timestamp) - Date.parse(b.event.timestamp) || a.i - b.i)
    .map((x) => x.event);
  const state = new Map<string, { branch: string | null; path: string }>(); // normalized path -> now
  const placed: Placed[] = [];
  for (const event of sorted) {
    const { path, branch } = ownContext(event);
    if (path && branch !== undefined && event.source === "git") state.set(norm(path), { branch, path });
    let resolved: string | null = null;
    let known = false;
    let root = path;
    if (branch !== undefined) {
      resolved = branch;
      known = true;
    } else if (path) {
      // Longest known worktree path that contains the cwd.
      const n = norm(path);
      let best = "";
      for (const w of state.keys()) {
        if ((n === w || n.startsWith(`${w}/`)) && w.length > best.length) best = w;
      }
      if (best) {
        const w = state.get(best);
        resolved = w?.branch ?? null;
        root = w?.path ?? path;
        known = true;
      }
    }
    placed.push({ event, branch: resolved, path: root, known });
  }
  return { placed, gitWorktrees: new Set(state.keys()) };
}

/** Links events to work items using issue-key, branch and worktree anchors only. */
export function linkEvents(events: readonly VantageEvent[], opts: LinkOptions = {}): LinkResult {
  const defaults = new Set(opts.defaultBranches ?? DEFAULT_BRANCHES);
  const mains = new Set((opts.mainWorktrees ?? []).map(norm));
  const undone = opts.undone ?? new Set<string>();
  const repo = opts.repo ?? "";
  const { placed, gitWorktrees } = place(events);

  const lineage = sessionLineage(events);
  const rootOf = (sid: string): string => rootSession(sid, lineage);
  // A derived session's edits count for its whole family: the root's item is provisional when any member edited.
  const editRoots = new Set<string>();
  for (const e of events) if (e.kind === "file.edited" && e.sessionId) editRoots.add(rootOf(e.sessionId));

  const slots: Array<{ link?: Link; unlinked?: Unlinked }> = [];
  const emit = (
    i: number,
    p: Placed,
    itemKey: string,
    kind: LinkAnchorKind,
    value: string,
    rule: LinkRule,
  ): void => {
    const { source, sourceId } = p.event;
    if (undone.has(undoKey(source, sourceId, itemKey))) {
      slots[i] = { unlinked: { eventSource: source, eventSourceId: sourceId, reason: "undone" } };
      return;
    }
    slots[i] = {
      link: {
        eventSource: source,
        eventSourceId: sourceId,
        itemKey,
        method: "anchor",
        anchor: { kind, value },
        rule,
        confidence: 1,
      },
    };
  };

  const deferred: number[] = [];
  placed.forEach((p, i) => {
    const { event, branch } = p;
    const onDefault = branch !== null && defaults.has(branch);

    // 1. Issue key wins; a branch naming several keys sends the event to the key it names itself.
    const branchKeys = branch && !onDefault ? extractIssueKeys(branch, opts.projectKeys) : [];
    const first = branchKeys[0];
    if (first) {
      const named = branchKeys.length > 1 ? extractIssueKeys(eventText(event), opts.projectKeys) : [];
      const own = named.find((k) => branchKeys.includes(k));
      const key = own ?? first;
      emit(i, p, `issue:${key}`, "issue_key", key, own ? "issue-key-text" : "issue-key-branch");
      return;
    }
    // 2. No key: one item per non-default branch.
    if (branch && !onDefault) {
      emit(i, p, `branch:${repo}:${branch}`, "branch", branch, "branch");
      return;
    }
    // 2b. Linked worktree with no branch (detached HEAD) anchors on the worktree itself.
    if (!branch && p.known && p.path && !mains.has(norm(p.path)) && gitWorktrees.has(norm(p.path))) {
      emit(i, p, `worktree:${p.path}`, "worktree", p.path, "worktree");
      return;
    }
    deferred.push(i);
  });

  // The anchored item most of a family's events landed on (ties go to the earliest event).
  const familyItem = new Map<string, { itemKey: string; anchor: Link["anchor"] }>();
  {
    const tally = new Map<string, Map<string, { n: number; anchor: Link["anchor"] }>>();
    placed.forEach((p, i) => {
      const link = slots[i]?.link;
      const sid = p.event.sessionId;
      if (!link || !sid) return;
      const root = rootOf(sid);
      const per = tally.get(root) ?? new Map();
      const hit = per.get(link.itemKey) ?? { n: 0, anchor: link.anchor };
      hit.n++;
      per.set(link.itemKey, hit);
      tally.set(root, per);
    });
    for (const [root, per] of tally) {
      let best: { itemKey: string; n: number; anchor: Link["anchor"] } | undefined;
      for (const [itemKey, v] of per) if (!best || v.n > best.n) best = { itemKey, ...v };
      if (best) familyItem.set(root, { itemKey: best.itemKey, anchor: best.anchor });
    }
  }
  const family = new Map<string, number>(); // root -> number of sessions seen
  {
    const seen = new Set<string>();
    for (const p of placed) {
      const sid = p.event.sessionId;
      if (!sid || seen.has(sid)) continue;
      seen.add(sid);
      family.set(rootOf(sid), (family.get(rootOf(sid)) ?? 0) + 1);
    }
  }

  // 4. Default branch or unknown context. A derived session joins the item its family already has
  // (D86); otherwise a session, or family, with edits becomes one provisional item on the root session.
  for (const i of deferred) {
    const p = placed[i];
    if (!p) continue;
    const { event } = p;
    const sid = event.sessionId;
    if (sid) {
      const root = rootOf(sid);
      const derived = (family.get(root) ?? 1) > 1;
      const fam = derived ? familyItem.get(root) : undefined;
      if (fam) {
        emit(i, p, fam.itemKey, fam.anchor.kind, fam.anchor.value, "derived-session");
        continue;
      }
      if (editRoots.has(root)) {
        emit(
          i,
          p,
          `session:${root}`,
          "session",
          root,
          root === sid ? "provisional-session" : "derived-session",
        );
        continue;
      }
    }
    slots[i] = {
      unlinked: { eventSource: event.source, eventSourceId: event.sourceId, reason: "no-anchor" },
    };
  }

  const links: Link[] = [];
  const unlinked: Unlinked[] = [];
  for (const slot of slots) {
    if (slot?.link) links.push(slot.link);
    else if (slot?.unlinked) unlinked.push(slot.unlinked);
  }
  return { links, unlinked };
}
