// Pure git logic: parsers, repo identity, event diffing, scan cadence.
// Adapter rules: docs/specs/ingestion.md (git row, event catalog, polling budget).
import type { EventKind, VantageEvent } from "./events.ts";

export interface WorktreeInfo {
  path: string;
  head: string | null;
  /** Short branch name, or null when detached or bare. */
  branch: string | null;
  bare: boolean;
}

/** Parses `git worktree list --porcelain -z`. */
export function parseWorktreeList(output: string): WorktreeInfo[] {
  const result: WorktreeInfo[] = [];
  let cur: WorktreeInfo | null = null;
  for (const field of output.split("\0")) {
    if (field === "") {
      if (cur) result.push(cur);
      cur = null;
      continue;
    }
    if (field.startsWith("worktree ")) {
      if (cur) result.push(cur);
      cur = { path: field.slice(9), head: null, branch: null, bare: false };
    } else if (cur) {
      if (field.startsWith("HEAD ")) cur.head = field.slice(5);
      else if (field.startsWith("branch ")) cur.branch = field.slice(7).replace(/^refs\/heads\//, "");
      else if (field === "bare") cur.bare = true;
    }
  }
  if (cur) result.push(cur);
  return result;
}

export interface DirtyFile {
  path: string;
  /** Two-letter XY status from git, `??` for untracked. */
  status: string;
}

export interface WorktreeStatus {
  head: string | null;
  branch: string | null;
  dirty: DirtyFile[];
}

/** Parses `git status --porcelain=v2 --branch -z`. */
export function parseStatus(output: string): WorktreeStatus {
  const status: WorktreeStatus = { head: null, branch: null, dirty: [] };
  const fields = output.split("\0");
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i] ?? "";
    if (f === "") continue;
    if (f.startsWith("# branch.oid ")) {
      const oid = f.slice(13);
      status.head = oid === "(initial)" ? null : oid;
    } else if (f.startsWith("# branch.head ")) {
      const name = f.slice(14);
      status.branch = name === "(detached)" ? null : name;
    } else if (f.startsWith("1 ")) {
      status.dirty.push({ path: f.split(" ").slice(8).join(" "), status: f.slice(2, 4) });
    } else if (f.startsWith("2 ")) {
      status.dirty.push({ path: f.split(" ").slice(9).join(" "), status: f.slice(2, 4) });
      i++; // the original path follows as its own field
    } else if (f.startsWith("u ")) {
      status.dirty.push({ path: f.split(" ").slice(10).join(" "), status: f.slice(2, 4) });
    } else if (f.startsWith("? ")) {
      status.dirty.push({ path: f.slice(2), status: "??" });
    }
  }
  return status;
}

export interface GitCommit {
  sha: string;
  parents: string[];
  /** ISO 8601 committer date. */
  timestamp: string;
  subject: string;
}

/** `git log` format for {@link parseLog}. */
export const LOG_FORMAT = "%H%x1f%P%x1f%cI%x1f%s%x1e";

export function parseLog(output: string): GitCommit[] {
  const commits: GitCommit[] = [];
  for (const record of output.split("\x1e")) {
    const trimmed = record.replace(/^\n+/, "");
    if (trimmed === "") continue;
    const [sha, parents, timestamp, subject] = trimmed.split("\x1f");
    if (!sha || timestamp === undefined || Number.isNaN(Date.parse(timestamp))) continue;
    commits.push({
      sha,
      parents: parents ? parents.split(" ") : [],
      timestamp,
      subject: subject ?? "",
    });
  }
  return commits;
}

/** Strips scheme, credentials, `.git` and case so ssh and https forms of one remote match. */
export function normalizeRemoteUrl(url: string): string {
  let u = url.trim();
  const scp = /^[^@/\s]+@([^:/\s]+):(.+)$/.exec(u);
  if (scp) u = `${scp[1]}/${scp[2]}`;
  else u = u.replace(/^[a-z+]+:\/\//i, "").replace(/^[^@/]+@/, "");
  u = u
    .replace(/^([^/]+):\d+\//, "$1/")
    .replace(/\/+$/, "")
    .replace(/\.git$/, "");
  return u.toLowerCase();
}

/**
 * Stable repo identity that survives moves and renames (operations edge cases):
 * remote URL plus first commit id, never the path.
 */
export function repoKey(remoteUrl: string | null, firstCommit: string | null): string | null {
  if (!remoteUrl && !firstCommit) return null;
  return `${remoteUrl ? normalizeRemoteUrl(remoteUrl) : "no-remote"}#${firstCommit ?? "no-commits"}`;
}

/** What the scanner remembers per worktree between scans. */
export interface ScanState {
  head: string | null;
  branch: string | null;
  /** Fingerprint of the last emitted dirty set. */
  dirtyKey: string | null;
}

export interface ScanInput {
  repoKey: string;
  worktreePath: string;
  status: WorktreeStatus;
  /** Commits reachable from HEAD and not from the previous head, newest first. */
  newCommits: GitCommit[];
  /** ISO timestamp of the scan. */
  now: string;
}

export interface ScanResult {
  events: VantageEvent[];
  state: ScanState;
}

export function dirtyKey(dirty: readonly DirtyFile[]): string {
  return dirty
    .map((d) => `${d.status} ${d.path}`)
    .toSorted()
    .join("\n");
}

function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function commitKind(c: GitCommit): EventKind {
  if (c.parents.length > 1) return "merge.completed";
  return c.subject.startsWith('Revert "') ? "revert.created" : "commit.created";
}

/** Turns one scan into events. `prev` is null for a worktree not scanned before. */
export function diffScan(prev: ScanState | null, input: ScanInput): ScanResult {
  const { repoKey: repo, worktreePath, status, newCommits, now } = input;
  const events: VantageEvent[] = [];

  for (const c of newCommits.toReversed()) {
    events.push({
      sourceId: `git:${repo}:commit:${c.sha}`,
      source: "git",
      kind: commitKind(c),
      timestamp: c.timestamp,
      payload: {
        sha: c.sha,
        parents: c.parents,
        subject: c.subject,
        branch: status.branch,
        worktree: worktreePath,
      },
    });
  }

  if (prev && prev.branch !== status.branch) {
    events.push({
      sourceId: `git:${repo}:checkout:${worktreePath}:${now}`,
      source: "git",
      kind: "branch.checked_out",
      timestamp: now,
      payload: { from: prev.branch, to: status.branch, head: status.head, worktree: worktreePath },
    });
  }

  const key = dirtyKey(status.dirty);
  if (!prev || prev.dirtyKey !== key) {
    events.push({
      sourceId: `git:${repo}:scan:${worktreePath}:${hash(`${status.head}|${key}`)}:${now}`,
      source: "git",
      kind: "worktree.scanned",
      timestamp: now,
      payload: { worktree: worktreePath, branch: status.branch, head: status.head, dirty: status.dirty },
    });
  }

  return { events, state: { head: status.head, branch: status.branch, dirtyKey: key } };
}

export const ACTIVE_SCAN_MS = 30_000;
export const IDLE_SCAN_MS = 600_000;
/** A worktree is active while its last activity is within this window. */
export const ACTIVE_WINDOW_MS = 600_000;

/** Scan cadence: 30 s for active worktrees, 10 min for others; doubled on battery saver. */
export function scanIntervalMs(lastActivityMs: number | null, nowMs: number, batterySaver = false): number {
  const active = lastActivityMs !== null && nowMs - lastActivityMs <= ACTIVE_WINDOW_MS;
  return (active ? ACTIVE_SCAN_MS : IDLE_SCAN_MS) * (batterySaver ? 2 : 1);
}
