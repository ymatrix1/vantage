// Runs the pure stage machine (@vantage/core) over the linked events and persists the result in
// work_items, proofs, flags and stage_changes (docs/specs/data-schema.md). Every pass replays all
// events, so the tables are derived state and can be rebuilt at any time. Also the read side the
// Stop gate, status line and Track page call.
import { computeStages, fallbackTitle, projectNameOf } from "@vantage/core";
import type { ItemState, LinkOptions, StageOptions } from "@vantage/core";
import { linkStoredEvents, loadEvents } from "./linking.ts";
import { GIT_QUESTIONS_PER_PASS, resolveRepo, worktreeRepos } from "./projects.ts";
import type { Store } from "./store.ts";
import { classifyPaths, editedPaths, newScratchCache } from "./scratch.ts";
import { requestTitleMap } from "./titles.ts";

export interface StagePassOptions extends StageOptions {
  link?: Omit<LinkOptions, "undone">;
  /** Use stored first-request titles for provisional session items (default on, D95). */
  requestTitles?: boolean;
  /** Ask git which edited files are ignored (default on, proposed D102); off leaves only the name rules. */
  gitScratch?: boolean;
}

export interface StagePassResult {
  items: number;
  proofs: number;
}

type Row = Record<string, unknown>;
const text = (r: Row, c: string): string => {
  const v = r[c];
  return typeof v === "string" ? v : "";
};
const textOrNull = (r: Row, c: string): string | null => {
  const v = r[c];
  return typeof v === "string" ? v : null;
};
const num = (r: Row, c: string): number => Number(r[c] ?? 0);

/** Title and repo from the item key; an item with no name of its own gets a title from repo, branch and date. */
type TitleSource = "anchor" | "request" | "fallback";

function titleOf(
  item: ItemState,
  requests: ReadonlyMap<string, string>,
): { title: string; repo: string | null; source: TitleSource } {
  const [kind = "", ...rest] = item.itemKey.split(":");
  const value = rest.join(":");
  if (kind === "issue") return { title: value, repo: item.repo, source: "anchor" };
  if (kind === "branch") {
    const i = value.indexOf(":");
    return { title: value.slice(i + 1), repo: i > 0 ? value.slice(0, i) : item.repo, source: "anchor" };
  }
  if (kind === "worktree")
    return {
      title: value.replaceAll("\\", "/").split("/").pop() ?? value,
      repo: item.repo,
      source: "anchor",
    };
  const requested = requests.get(value);
  if (requested) return { title: requested, repo: item.repo, source: "request" };
  return {
    title: fallbackTitle({
      repo: item.repo,
      branch: item.branch,
      firstActivity: item.firstActivity,
      id: value,
    }),
    repo: item.repo,
    source: "fallback",
  };
}

/** Links every stored event, evaluates every item, and rewrites the derived tables. */
const scratchCache = newScratchCache();

export function runStagePass(store: Store, opts: StagePassOptions = {}, now = new Date()): StagePassResult {
  const { link, requestTitles, gitScratch, ...stageOpts } = opts;
  const requests: ReadonlyMap<string, string> =
    requestTitles === false ? new Map<string, string>() : requestTitleMap(store);
  const linked = linkStoredEvents(store, link ?? {}, now);
  const { ids, events } = loadEvents(store);
  const firstSeen = new Map<string, string>();
  for (const r of store.db.prepare("SELECT item_key, created_at FROM work_items").all()) {
    firstSeen.set(text(r, "item_key"), text(r, "created_at"));
  }
  const git =
    gitScratch === false
      ? { ignored: new Set<string>(), relative: new Map<string, string>() }
      : classifyPaths(editedPaths(events), scratchCache, now.getTime());
  const items = computeStages(events, linked.links, {
    now,
    firstSeen,
    scratchPaths: git.ignored,
    repoRelative: git.relative,
    ...stageOpts,
  });
  const at = now.toISOString();
  const eventId = (e: { source: string; sourceId: string }): number =>
    ids.get(`${e.source}|${e.sourceId}`) ?? 0;
  let proofCount = 0;

  store.transaction(() => {
    const db = store.db;
    const keep = new Set(items.map((i) => i.itemKey));
    for (const r of db.prepare("SELECT id, item_key FROM work_items").all()) {
      if (keep.has(text(r, "item_key"))) continue;
      const id = num(r, "id");
      for (const t of ["proofs", "flags", "stage_changes"]) {
        db.prepare(`DELETE FROM ${t} WHERE work_item_id = ?`).run(id);
      }
      db.prepare("DELETE FROM work_items WHERE id = ?").run(id);
    }
    const worktrees = worktreeRepos(store);
    const gitBudget = { left: GIT_QUESTIONS_PER_PASS };
    for (const item of items) {
      const named = titleOf(item, requests);
      const { source } = named;
      // The repo a person knows (git identity), never the worktree folder an agent session ran in.
      const repo = resolveRepo(store, item.itemKey, named.repo, worktrees, gitBudget);
      // A detached HEAD has no branch name to show; the repo is the next best thing.
      const shown = repo ? (projectNameOf(repo) ?? repo) : null;
      let title = named.title;
      // An untitled session reads from the resolved repo, never from the folder it ran in.
      if (named.source === "fallback") {
        title = fallbackTitle({
          repo: shown,
          branch: item.branch,
          firstActivity: item.firstActivity,
          id: item.itemKey.split(":").slice(1).join(":"),
        });
      }
      // A worktree item is titled with a folder name; its branch is a better name.
      if (item.itemKey.startsWith("worktree:") && item.branch) title = item.branch;
      if (title === "HEAD") title = `detached HEAD${shown ? ` in ${shown}` : ""}`;
      db.prepare(
        `INSERT INTO work_items (item_key, title, title_source, repo, branch, has_edits, stage, proof_status, proof_level, docs_only,
           first_activity, last_activity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (item_key) DO UPDATE SET title = excluded.title, title_source = excluded.title_source, repo = excluded.repo,
           branch = excluded.branch, has_edits = excluded.has_edits,
           stage = excluded.stage, proof_status = excluded.proof_status,
           proof_level = excluded.proof_level, docs_only = excluded.docs_only,
           first_activity = excluded.first_activity, last_activity = excluded.last_activity,
           updated_at = excluded.updated_at`,
      ).run(
        item.itemKey,
        title,
        source,
        repo,
        item.branch,
        item.codeEdits > 0 ? 1 : 0,
        item.stage,
        item.proofStatus,
        item.proofLevel,
        item.docsOnly ? 1 : 0,
        item.firstActivity,
        item.lastActivity,
        at,
        at,
      );
      const id = num(
        db.prepare("SELECT id FROM work_items WHERE item_key = ?").get(item.itemKey) ?? {},
        "id",
      );

      db.prepare("DELETE FROM proofs WHERE work_item_id = ?").run(id);
      for (const p of item.proofs) {
        db.prepare(
          `INSERT INTO proofs (work_item_id, event_id, type, level, source, command, cwd, started_at, state,
             weak_reason, expired_by_event_id, fingerprint)
           VALUES (?, ?, ?, ?, 'hook', ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          eventId(p.evidence),
          p.type,
          p.level,
          p.command,
          p.cwd ?? null,
          p.ranAt,
          p.state,
          p.weak ?? null,
          p.expiredBy ? eventId(p.expiredBy) : null,
          p.fingerprint,
        );
        proofCount++;
      }
      db.prepare("DELETE FROM stage_changes WHERE work_item_id = ?").run(id);
      for (const t of item.transitions) {
        db.prepare(
          "INSERT INTO stage_changes (work_item_id, from_stage, to_stage, at, event_id, reason) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(id, t.from, t.to, t.at, eventId(t.evidence), t.reason);
      }
      persistFlags(store, id, item, at);
    }
  });
  return { items: items.length, proofs: proofCount };
}

/** Flags keep their id and dismissal while they stay raised; a cleared flag that comes back is new. */
function persistFlags(store: Store, id: number, item: ItemState, at: string): void {
  const db = store.db;
  const open = new Set<string>(item.flags.map((f) => f.kind));
  for (const f of item.flags) {
    const prev = db
      .prepare("SELECT cleared_at FROM flags WHERE work_item_id = ? AND kind = ?")
      .get(id, f.kind);
    if (!prev) {
      db.prepare(
        "INSERT INTO flags (work_item_id, kind, severity, raised_at, reason) VALUES (?, ?, ?, ?, ?)",
      ).run(id, f.kind, f.severity, f.raisedAt, f.reason);
    } else if (prev["cleared_at"] !== null) {
      db.prepare(
        "UPDATE flags SET raised_at = ?, cleared_at = NULL, dismissed = 0, severity = ?, reason = ? WHERE work_item_id = ? AND kind = ?",
      ).run(f.raisedAt, f.severity, f.reason, id, f.kind);
    } else {
      db.prepare("UPDATE flags SET reason = ? WHERE work_item_id = ? AND kind = ?").run(f.reason, id, f.kind);
    }
  }
  for (const r of db
    .prepare("SELECT kind FROM flags WHERE work_item_id = ? AND cleared_at IS NULL")
    .all(id)) {
    const kind = text(r, "kind");
    if (!open.has(kind)) {
      db.prepare("UPDATE flags SET cleared_at = ? WHERE work_item_id = ? AND kind = ?").run(at, id, kind);
    }
  }
}

export interface StoredProof {
  eventId: number;
  type: string;
  level: number;
  state: string;
  weakReason: string | null;
  command: string;
  ranAt: string;
  expiredByEventId: number | null;
  fingerprint: string;
}
export interface StoredFlag {
  kind: string;
  severity: string;
  reason: string;
  raisedAt: string;
}
export interface StoredTransition {
  from: string | null;
  to: string;
  at: string;
  eventId: number;
  reason: string;
}
export interface ItemSummary {
  itemKey: string;
  title: string;
  repo: string | null;
  stage: string;
  proofStatus: string;
  proofLevel: number;
  docsOnly: boolean;
  branch: string | null;
  /** Where the title came from: its key (`anchor`), a stored first request, or repo, branch and date. */
  titleSource: string;
  /** False when no code edit is linked (a conversation, or documentation only). */
  hasEdits: boolean;
  firstActivity: string;
  lastActivity: string;
  /** Open and not dismissed. */
  flags: StoredFlag[];
}
export interface ItemDetail extends ItemSummary {
  proofs: StoredProof[];
  transitions: StoredTransition[];
}

function flagsOf(store: Store, id: number): StoredFlag[] {
  return store.db
    .prepare(
      "SELECT kind, severity, reason, raised_at FROM flags WHERE work_item_id = ? AND cleared_at IS NULL AND dismissed = 0 ORDER BY raised_at, kind",
    )
    .all(id)
    .map((r) => ({
      kind: text(r, "kind"),
      severity: text(r, "severity"),
      reason: text(r, "reason"),
      raisedAt: text(r, "raised_at"),
    }));
}

export function summary(store: Store, r: Row): ItemSummary {
  return {
    itemKey: text(r, "item_key"),
    title: text(r, "title"),
    repo: textOrNull(r, "repo"),
    stage: text(r, "stage"),
    proofStatus: text(r, "proof_status"),
    proofLevel: num(r, "proof_level"),
    docsOnly: num(r, "docs_only") === 1,
    branch: textOrNull(r, "branch"),
    titleSource: text(r, "title_source") || "fallback",
    hasEdits: num(r, "has_edits") === 1,
    firstActivity: text(r, "first_activity"),
    lastActivity: text(r, "last_activity"),
    flags: flagsOf(store, num(r, "id")),
  };
}

/** All items, most recently active first. Read by the Stop gate, status line and Track page. */
export function listItems(store: Store): ItemSummary[] {
  return store.db
    .prepare("SELECT * FROM work_items ORDER BY last_activity DESC, item_key")
    .all()
    .map((r) => summary(store, r));
}

/** One item with its proofs (expired and failed too) and its stage history, or null. */
export function getItem(store: Store, itemKey: string): ItemDetail | null {
  const r = store.db.prepare("SELECT * FROM work_items WHERE item_key = ?").get(itemKey);
  if (!r) return null;
  const id = num(r, "id");
  const proofs = store.db
    .prepare("SELECT * FROM proofs WHERE work_item_id = ? ORDER BY started_at, id")
    .all(id)
    .map((p) => ({
      eventId: num(p, "event_id"),
      type: text(p, "type"),
      level: num(p, "level"),
      state: text(p, "state"),
      weakReason: textOrNull(p, "weak_reason"),
      command: text(p, "command"),
      ranAt: text(p, "started_at"),
      expiredByEventId: p["expired_by_event_id"] === null ? null : num(p, "expired_by_event_id"),
      fingerprint: text(p, "fingerprint"),
    }));
  const transitions = store.db
    .prepare("SELECT * FROM stage_changes WHERE work_item_id = ? ORDER BY at, id")
    .all(id)
    .map((t) => ({
      from: textOrNull(t, "from_stage"),
      to: text(t, "to_stage"),
      at: text(t, "at"),
      eventId: num(t, "event_id"),
      reason: text(t, "reason"),
    }));
  return { ...summary(store, r), proofs, transitions };
}

/** Marks an open flag dismissed; it stays dismissed until the condition clears and returns. */
export function dismissFlag(store: Store, itemKey: string, kind: string): boolean {
  const r = store.db
    .prepare(
      `UPDATE flags SET dismissed = 1 WHERE kind = ? AND cleared_at IS NULL AND dismissed = 0
         AND work_item_id = (SELECT id FROM work_items WHERE item_key = ?)`,
    )
    .run(kind, itemKey);
  return Number(r.changes) > 0;
}
