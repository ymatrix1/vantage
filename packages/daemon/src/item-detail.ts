// `GET /api/items/:id`: sessions, edited files and where the work lives, for the Track page's inline
// detail. Pure reads over events and links. Files are base names only; the path is the worktree's.
import { repoUrlOf, type ItemDetailView, type ItemSession } from "@vantage/core";
import { itemCwd } from "./projects.ts";
import type { Store } from "./store.ts";

const MAX_FILES = 40;
const baseName = (p: string): string => p.replaceAll("\\", "/").split("/").filter(Boolean).pop() ?? p;
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

function editedFiles(store: Store, itemKey: string): { names: string[]; total: number } {
  const rows = store.db
    .prepare(
      `SELECT e.payload_json AS p FROM links l JOIN events e ON e.id = l.event_id
       WHERE l.item_key = ? AND l.undone_at IS NULL AND e.kind = 'file.edited' ORDER BY e.occurred_at`,
    )
    .all(itemKey);
  const seen = new Set<string>();
  for (const r of rows) {
    let p: Record<string, unknown>;
    try {
      const v: unknown = JSON.parse(String(r["p"]));
      p = typeof v === "object" && v !== null ? Object.fromEntries(Object.entries(v)) : {};
    } catch {
      continue;
    }
    const paths = Array.isArray(p["paths"]) ? p["paths"] : [];
    for (const x of [p["path"], ...paths]) {
      const s = str(x);
      if (s) seen.add(baseName(s));
    }
  }
  const all = [...seen];
  return { names: all.slice(0, MAX_FILES), total: all.length };
}

function sessionsOf(store: Store, itemKey: string): ItemSession[] {
  const rows = store.db
    .prepare(
      `SELECT e.session_id AS s, MIN(e.occurred_at) AS a, MAX(e.occurred_at) AS b, COUNT(*) AS n
       FROM links l JOIN events e ON e.id = l.event_id
       WHERE l.item_key = ? AND l.undone_at IS NULL AND e.session_id IS NOT NULL
       GROUP BY e.session_id ORDER BY MIN(e.occurred_at)`,
    )
    .all(itemKey);
  const parent = store.db.prepare(
    `SELECT json_extract(payload_json, '$.parentSessionId') AS p FROM events
     WHERE kind = 'session.derived' AND session_id = ? ORDER BY occurred_at LIMIT 1`,
  );
  return rows.flatMap((r) => {
    const id = str(r["s"]);
    if (!id) return [];
    const p = str(parent.get(id)?.["p"]);
    return [
      {
        id,
        parentId: p && p !== id ? p : null,
        firstAt: String(r["a"]),
        lastAt: String(r["b"]),
        events: Number(r["n"]),
      },
    ];
  });
}

export function itemDetailView(store: Store, itemKey: string): ItemDetailView | null {
  const w = store.db.prepare("SELECT repo, branch FROM work_items WHERE item_key = ?").get(itemKey);
  if (!w) return null;
  const sha = store.db
    .prepare(
      `SELECT json_extract(e.payload_json, '$.sha') AS sha FROM links l JOIN events e ON e.id = l.event_id
       WHERE l.item_key = ? AND l.undone_at IS NULL AND e.kind IN ('commit.created', 'merge.completed')
         AND json_extract(e.payload_json, '$.sha') IS NOT NULL ORDER BY e.occurred_at DESC LIMIT 1`,
    )
    .get(itemKey);
  const repo = str(w["repo"]);
  const lastSha = str(sha?.["sha"]);
  return {
    id: itemKey,
    repo,
    repos: store.db
      .prepare("SELECT repo FROM item_repos WHERE item_key = ? ORDER BY position, repo")
      .all(itemKey)
      .map((r) => String(r["repo"])),
    repoUrl: repoUrlOf(repo),
    branch: str(w["branch"]),
    worktreePath: itemCwd(store, itemKey),
    lastCommitSha: lastSha && /^[0-9a-f]{7,64}$/i.test(lastSha) ? lastSha : null,
    sessions: sessionsOf(store, itemKey),
    files: editedFiles(store, itemKey),
  };
}
