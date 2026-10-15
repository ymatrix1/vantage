// Which repo an item belongs to, from git identity and never from a folder name. An agent session only
// knows its working folder (for a worktree, a random name); the git scanner knows every worktree's repo.
// Matching the two at read time (no migration: events stay immutable) gives the repo a person recognises.
// An item whose folder lies in no scanned worktree has no repo.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { repoInfoOf, repoKey } from "@vantage/core";
import type { Store } from "./store.ts";

const norm = (p: string): string => p.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();
const folderOf = (p: string): string => p.replaceAll("\\", "/").split("/").filter(Boolean).pop() ?? p;

/** A scanned worktree's repo: the stored `repo` value is `remotePath` when there is a remote, else `name`. */
export interface RepoRef {
  key: string;
  /** `host/owner/repo` from the normalised remote, or null when the repo has no remote. */
  remotePath: string | null;
  /** `host/Owner/repo` in the case the remote was written in (the scanner's `repo`), when known. */
  display: string | null;
  /** The main worktree's folder name for a repo with no remote. */
  folder: string | null;
}

/** What is stored in `work_items.repo` and shown as the project; the owner keeps its case. */
export const repoValue = (r: RepoRef): string | null => r.display ?? r.remotePath ?? r.folder;

/** `host/owner/repo` for a `repoKey` (`host/owner/repo#firstcommit`); `no-remote` and empty give null. */
export function remotePathOfKey(key: string | null): string | null {
  const path = (key ?? "").split("#")[0] ?? "";
  return path === "" || path === "no-remote" ? null : path;
}

/** Worktree path (normalised) to its repo, from the `worktree.scanned` events the git scanner stored. */
export function worktreeRepos(store: Store): Map<string, RepoRef> {
  const rows = store.db
    .prepare(
      `SELECT MIN(source_id) AS sid, json_extract(payload_json, '$.worktree') AS w,
              json_extract(payload_json, '$.repo.key') AS k, json_extract(payload_json, '$.repo.repoName') AS n,
              json_extract(payload_json, '$.repo.org') AS org, json_extract(payload_json, '$.repo.host') AS host,
              MAX(occurred_at) AS t
       FROM events WHERE source = 'git' AND kind = 'worktree.scanned'
         AND json_extract(payload_json, '$.worktree') IS NOT NULL
       GROUP BY w, k, n, org, host ORDER BY t`,
    )
    .all();
  const byKey = new Map<string, { paths: Set<string>; name: string | null; display: string | null }>();
  for (const r of rows) {
    const w = r["w"];
    if (typeof w !== "string") continue;
    // New events carry `repo.key`; older ones only name it in the id: `git:<repoKey>:scan:...`.
    const sid = r["sid"];
    const key =
      typeof r["k"] === "string"
        ? r["k"]
        : typeof sid === "string" && sid.startsWith("git:")
          ? sid.slice(4).split(":")[0]
          : undefined;
    if (!key) continue;
    const e = byKey.get(key) ?? { paths: new Set<string>(), name: null, display: null };
    e.paths.add(w);
    if (typeof r["n"] === "string") e.name = r["n"];
    // The newest event wins, so every worktree of a repo shows the owner in one case.
    const { host, org } = r;
    if (typeof host === "string" && typeof org === "string" && typeof r["n"] === "string") {
      e.display = `${host}/${org}/${r["n"]}`;
    }
    byKey.set(key, e);
  }
  const out = new Map<string, RepoRef>();
  for (const [key, e] of byKey) {
    const remotePath = remotePathOfKey(key);
    // No remote: the scanner's name, else the shortest worktree path's folder (the main one).
    const main = [...e.paths].toSorted((a, b) => a.length - b.length)[0];
    const folder = remotePath ? null : (e.name ?? (main ? folderOf(main) : null));
    for (const p of e.paths) out.set(norm(p), { key, remotePath, display: e.display, folder });
  }
  return out;
}

/** The folder an item's latest linked event ran in, or null. */
export function itemCwd(store: Store, itemKey: string): string | null {
  const r = store.db
    .prepare(
      `SELECT COALESCE(json_extract(e.payload_json, '$.cwd'), json_extract(e.payload_json, '$.worktree')) AS c
       FROM links l JOIN events e ON e.id = l.event_id
       WHERE l.item_key = ? AND l.undone_at IS NULL
         AND COALESCE(json_extract(e.payload_json, '$.cwd'), json_extract(e.payload_json, '$.worktree')) IS NOT NULL
       ORDER BY e.occurred_at DESC LIMIT 1`,
    )
    .get(itemKey);
  return typeof r?.["c"] === "string" ? r["c"] : null;
}

/** The repo whose scanned worktree contains `cwd` (longest root wins), or null. */
export function repoForCwd(cwd: string, index: ReadonlyMap<string, RepoRef>): RepoRef | null {
  const c = norm(cwd);
  let best: RepoRef | null = null;
  let bestLen = -1;
  for (const [w, ref] of index) {
    if ((c === w || c.startsWith(`${w}/`)) && w.length > bestLen) {
      best = ref;
      bestLen = w.length;
    }
  }
  return best;
}

const askedGit = new Map<string, RepoRef | null>();

/** How many new folders one stage pass may ask git about. */
export interface GitBudget {
  left: number;
}
export const GIT_QUESTIONS_PER_PASS = 12;

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * A folder no scanned worktree contains may still be inside a git repo the scanner was never told about.
 * Ask git once per folder (remembered for the life of the process); a folder that is gone or is not a repo
 * has no repo. Only the remote and the first commit are read.
 */
export function gitRepoOfCwd(cwd: string, budget?: GitBudget): RepoRef | null {
  const k = norm(cwd);
  const known = askedGit.get(k);
  if (known !== undefined) return known;
  let ref: RepoRef | null = null;
  if (existsSync(cwd)) {
    // A pass runs inside the daemon's event loop: it may ask git about only a few new folders, and the
    // rest wait for the next pass (answers are remembered, so a first run settles in a few passes).
    if (budget) {
      if (budget.left <= 0) return null;
      budget.left--;
    }
    const remote = git(cwd, ["config", "--get", "remote.origin.url"]) || null;
    const first =
      git(cwd, ["rev-list", "--max-parents=0", "HEAD"])?.split(/\r?\n/).filter(Boolean).toSorted()[0] ?? null;
    const common = git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
    const mainFolder = common ? folderOf(common.replace(/[/\\]\.git[/\\]?$/, "")) : folderOf(cwd);
    const info = repoInfoOf(remote, first, mainFolder);
    if (info) {
      const key = repoKey(remote, first) ?? info.key;
      const remotePath = remotePathOfKey(key);
      ref = {
        key,
        remotePath,
        display: info.host ? `${info.host}/${info.org}/${info.repoName}` : null,
        folder: remotePath ? null : info.name,
      };
    }
  }
  askedGit.set(k, ref);
  return ref;
}

/**
 * The repo to store for an item. An item that already names a repo key (a git item) uses it; any other
 * item uses the repo of the worktree its latest event ran in; a path in no scanned worktree gives null.
 */
export function resolveRepo(
  store: Store,
  itemKey: string,
  named: string | null,
  index: ReadonlyMap<string, RepoRef>,
  budget?: GitBudget,
): string | null {
  if (named?.includes("#")) {
    const ref = [...index.values()].find((r) => r.key === named);
    return ref ? repoValue(ref) : remotePathOfKey(named);
  }
  const cwd = itemCwd(store, itemKey);
  const ref = cwd ? (repoForCwd(cwd, index) ?? gitRepoOfCwd(cwd, budget)) : null;
  return ref ? repoValue(ref) : null;
}
