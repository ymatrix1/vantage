// Which project (git remote) an item belongs to. An agent session only knows its working folder, which
// for a worktree is a random folder name; the git scanner knows each worktree's remote. Matching the two
// gives the repo a person recognises. Pure reads, plus one function the stage pass calls.
import type { Store } from "./store.ts";

const norm = (p: string): string => p.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();

/** `host/owner/repo` for a `repoKey` (`host/owner/repo#firstcommit`); `no-remote` and empty give null. */
export function remotePathOfKey(key: string | null): string | null {
  const path = (key ?? "").split("#")[0] ?? "";
  return path === "" || path === "no-remote" ? null : path;
}

/** Worktree path (normalised) to the repo key the git scanner saw it under, from stored git events. */
export function worktreeRepos(store: Store): Map<string, string> {
  const out = new Map<string, string>();
  const rows = store.db
    .prepare(
      `SELECT DISTINCT source_id AS sid, json_extract(payload_json, '$.worktree') AS w
       FROM events WHERE source = 'git' AND json_extract(payload_json, '$.worktree') IS NOT NULL`,
    )
    .all();
  for (const r of rows) {
    const sid = r["sid"];
    const w = r["w"];
    if (typeof sid !== "string" || typeof w !== "string" || !sid.startsWith("git:")) continue;
    // `git:<repoKey>:commit|checkout|scan:...`; a repo key holds no colon (ports are stripped).
    const key = sid.slice(4).split(":")[0];
    if (key) out.set(norm(w), key);
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

/** The repo key whose worktree contains `cwd` (longest path wins), or null. */
export function repoKeyForCwd(cwd: string, index: ReadonlyMap<string, string>): string | null {
  const c = norm(cwd);
  let best: string | null = null;
  let bestLen = -1;
  for (const [w, key] of index) {
    if ((c === w || c.startsWith(`${w}/`)) && w.length > bestLen) {
      best = key;
      bestLen = w.length;
    }
  }
  return best;
}

/**
 * The repo to store for an item: the remote path when the item can be tied to a worktree the git scanner
 * knows (or already names a repo key), else what the events said (a folder name), else null.
 */
export function resolveRepo(
  store: Store,
  itemKey: string,
  named: string | null,
  index: ReadonlyMap<string, string>,
): string | null {
  if (named?.includes("#")) return remotePathOfKey(named);
  const cwd = itemCwd(store, itemKey);
  const key = cwd ? repoKeyForCwd(cwd, index) : null;
  return remotePathOfKey(key) ?? named;
}
