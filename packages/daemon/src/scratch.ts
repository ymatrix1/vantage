// Which edited files git ignores (proposed D102). The stage pass asks once per path, in batches, and
// keeps the answers for a while; a repo or path git cannot answer for stays unclassified, which means
// "counts as code" in the stage machine. Read-only: only `rev-parse` and `check-ignore` run.
import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { dirname } from "node:path";
import { normalizeEditPath } from "@vantage/core";
import type { VantageEvent } from "@vantage/core";

const GIT_TIMEOUT_MS = 5000;
const MAX_OUTPUT = 4 * 1024 * 1024;
const BATCH = 200;
/** Answers older than this are asked again, so a `git add` or a new ignore rule is noticed. */
const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 20_000;

export interface ScratchCache {
  /** normalized path to "git ignores it" and its path inside the repo, with the time it was asked. */
  paths: Map<string, { ignored: boolean; rel: string; at: number }>;
  /** directory to its repo root, or null when it is not in a repo or git failed. */
  roots: Map<string, { root: string | null; at: number }>;
}

export const newScratchCache = (): ScratchCache => ({ paths: new Map(), roots: new Map() });

const isAbsolute = (p: string): boolean => /^(?:[A-Za-z]:[\\/]|\/)/.test(p) && !p.includes("\u0000");

/** Runs git read-only; any failure (missing git, not a repo, timeout, too much output) is null. */
function git(cwd: string, args: string[], input?: string): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      input,
      encoding: "utf8",
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT,
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });
  } catch (e) {
    // `git check-ignore` exits 1 when nothing was ignored: an answer, not a failure.
    if (e instanceof Error && "status" in e && e.status === 1 && "stdout" in e) {
      return typeof e.stdout === "string" ? e.stdout : "";
    }
    return null;
  }
}

/** The nearest existing folder at or above a path, or null. */
function existingDir(path: string): string | null {
  let dir = dirname(path);
  for (let i = 0; i < 64; i++) {
    if (existsSync(dir)) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
  return null;
}

function repoRoot(dir: string, cache: ScratchCache, now: number): string | null {
  const hit = cache.roots.get(dir);
  if (hit && now - hit.at < TTL_MS) return hit.root;
  const out = git(dir, ["rev-parse", "--show-toplevel"]);
  const root = out === null ? null : out.trim() || null;
  cache.roots.set(dir, { root, at: now });
  return root;
}

/** Absolute paths edited by the events: `path` and `paths` of file.edited events. */
export function editedPaths(events: readonly VantageEvent[]): Set<string> {
  const out = new Set<string>();
  for (const e of events) {
    if (e.kind !== "file.edited") continue;
    const one = e.payload["path"];
    if (typeof one === "string" && isAbsolute(one)) out.add(one);
    const many = e.payload["paths"];
    if (Array.isArray(many)) for (const p of many) if (typeof p === "string" && isAbsolute(p)) out.add(p);
  }
  return out;
}

export interface GitClassification {
  /** Normalized paths git ignores in their repo and does not track. */
  ignored: Set<string>;
  /** Normalized path to its path inside the repo, for every path git answered for. The stage machine
   * reads name rules (temp folders, caches) on this part only, so a repo that lives under a temp folder
   * is not scratch as a whole. */
  relative: Map<string, string>;
}

const slashed = (x: string): string => x.replaceAll("\\", "/");

/**
 * Path of `path` inside `root` (forward slashes), or the path itself when it is not under it. Git prints
 * the real path of the repo root, while an event may carry another spelling of the same folder (a
 * Windows 8.3 short name such as `RUNNER~1`, or a symlink), so a miss is retried with the path's
 * existing folder resolved.
 */
function relativeTo(path: string, root: string): string {
  const r = slashed(root).replace(/\/$/, "").toLowerCase();
  const inside = (p: string): string | null =>
    p.toLowerCase().startsWith(`${r}/`) ? p.slice(r.length + 1) : null;
  const direct = inside(slashed(path));
  if (direct !== null) return direct;
  const dir = existingDir(path);
  if (dir !== null) {
    try {
      const real = slashed(realpathSync.native(dir));
      const rest = slashed(path).slice(slashed(dir).length);
      return inside(real + rest) ?? slashed(path);
    } catch {
      // fall through: the path stays as given
    }
  }
  return slashed(path);
}

/**
 * What git says about `paths`: which it ignores (tracked files and untracked-but-not-ignored files are
 * not among them) and where each sits inside its repo. Paths git cannot answer for are in neither.
 * Never throws.
 */
export function classifyPaths(paths: Iterable<string>, cache: ScratchCache, now: number): GitClassification {
  const result = new Set<string>();
  const relative = new Map<string, string>();
  const ask = new Map<string, string[]>(); // repo root to the paths to ask about
  for (const path of paths) {
    const key = normalizeEditPath(path);
    const known = cache.paths.get(key);
    if (known && now - known.at < TTL_MS) {
      relative.set(key, known.rel);
      if (known.ignored) result.add(key);
      continue;
    }
    const dir = existingDir(path);
    const root = dir === null ? null : repoRoot(dir, cache, now);
    if (root === null) continue; // unclassified: not cached, git may appear later
    ask.set(root, [...(ask.get(root) ?? []), path]);
  }
  if (cache.paths.size > MAX_ENTRIES) cache.paths.clear();
  for (const [root, list] of ask) {
    for (let i = 0; i < list.length; i += BATCH) {
      const batch = list.slice(i, i + BATCH);
      const stdin = batch.join("\u0000") + "\u0000";
      // `check-ignore` does not report tracked files (without --no-index), so "ignored" here already
      // means ignored and untracked. Output paths are as given or relative to the repo root.
      const ignored = git(root, ["check-ignore", "-z", "--stdin"], stdin);
      if (ignored === null) continue; // git failed: leave unclassified
      const rootKey = normalizeEditPath(root).replace(/\/$/, "");
      const full = (t: string): string =>
        isAbsolute(t) ? normalizeEditPath(t) : `${rootKey}/${normalizeEditPath(t)}`;
      const ignoredSet = new Set(ignored.split("\u0000").filter(Boolean).map(full));
      for (const p of batch) {
        const key = normalizeEditPath(p);
        const isIgnored = ignoredSet.has(key);
        const rel = relativeTo(p, root);
        cache.paths.set(key, { ignored: isIgnored, rel, at: now });
        relative.set(key, rel);
        if (isIgnored) result.add(key);
      }
    }
  }
  return { ignored: result, relative };
}
