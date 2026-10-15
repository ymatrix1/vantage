// Suggestions from `vantage classify` and every way to decide them (docs/specs/classify.md).
// A suggestion is text about an item: a title, a topic and kind, or a grouping with another item. Nothing
// here reads or writes status, stage, proof or flags (D57). Accepting is always one batch with one undo.
import { createHash, randomUUID } from "node:crypto";
import type { Store } from "./store.ts";

export type SuggestionKind = "title" | "topic" | "group";
export type SuggestionStatus = "suggested" | "accepted" | "dismissed" | "undone";
export type BatchAction = "accept" | "dismiss" | "auto_accept";
export const SUGGESTION_KINDS: readonly SuggestionKind[] = ["title", "topic", "group"];

/** What read-only callers need: the CLI opens the database read-only, so it has a `db` and no `transaction`. */
export type ReadStore = Pick<Store, "db">;

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
const base = (p: string): string => p.replaceAll("\\", "/").split("/").pop() ?? p;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isKind = (v: string): v is SuggestionKind => v === "title" || v === "topic" || v === "group";
const isStatus = (v: string): v is SuggestionStatus =>
  v === "suggested" || v === "accepted" || v === "dismissed" || v === "undone";
const isAction = (v: string): v is BatchAction => v === "accept" || v === "dismiss" || v === "auto_accept";

/** `[eventId, itemKey]` pairs stored in a group suggestion's payload when it was accepted. */
function linkedPairs(v: unknown): [number, string][] {
  if (!Array.isArray(v)) return [];
  const out: [number, string][] = [];
  for (const p of v) {
    if (Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "string") out.push([p[0], p[1]]);
  }
  return out;
}

/** Titles of these items come from a ticket, a branch or a worktree name: a classifier title never replaces them. */
export const isExplicitKey = (itemKey: string): boolean => /^(?:issue|branch|worktree):/.test(itemKey);

export interface NewSuggestion {
  itemKey: string;
  kind: SuggestionKind;
  payload: Record<string, unknown>;
  confidence: number;
  contentHash: string;
}

export interface RunInfo {
  runId: string;
  model: string;
  promptHash: string;
}

/**
 * Stores the suggestions of one run. An older suggestion of the same kind for the same item that nobody
 * decided is replaced by the new one; decided ones stay as history.
 */
export function recordSuggestions(
  store: Store,
  run: RunInfo,
  rows: readonly NewSuggestion[],
  now: Date,
): number {
  const at = now.toISOString();
  return store.transaction(() => {
    const del = store.db.prepare(
      "DELETE FROM suggestions WHERE item_key = ? AND kind = ? AND status = 'suggested'",
    );
    const ins = store.db.prepare(
      `INSERT INTO suggestions (item_key, kind, payload_json, model, prompt_hash, content_hash, confidence, run_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const pairs = new Map(rows.map((s) => [JSON.stringify([s.kind, s.itemKey]), s] as const));
    for (const s of pairs.values()) del.run(s.itemKey, s.kind);
    for (const s of rows) {
      ins.run(
        s.itemKey,
        s.kind,
        JSON.stringify(s.payload),
        run.model,
        run.promptHash,
        s.contentHash,
        s.confidence,
        run.runId,
        at,
      );
    }
    return rows.length;
  });
}

/** Content hashes that already have a suggestion for this model and prompt, whatever its status: a rerun skips them. */
export function cachedHashes(store: ReadStore, model: string, promptHash: string): Set<string> {
  try {
    return new Set(
      store.db
        .prepare("SELECT DISTINCT content_hash FROM suggestions WHERE model = ? AND prompt_hash = ?")
        .all(model, promptHash)
        .map((r) => text(r, "content_hash")),
    );
  } catch {
    return new Set(); // a database the daemon has not upgraded yet has no suggestions table
  }
}

export interface SuggestionView {
  id: number;
  itemKey: string;
  kind: SuggestionKind;
  status: SuggestionStatus;
  confidence: number;
  /** What would change, in one line: the title, `topic (kind)`, or the other item's title. */
  summary: string;
  reason: string;
  itemTitle: string;
  repo: string | null;
  /** Group only: the item it would be grouped with. */
  withKey: string | null;
  batchId: string | null;
  createdAt: string;
}

export interface SuggestionFilter {
  kinds?: readonly SuggestionKind[];
  minConfidence?: number;
  /** Repo name (the folder name, any case). */
  repo?: string;
  ids?: readonly number[];
}

interface Full extends SuggestionView {
  payload: Record<string, unknown>;
  withTitle: string | null;
  firstActivity: string;
}

function payloadOf(r: Row): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(text(r, "payload_json"));
    return isRec(v) ? v : {};
  } catch {
    return {};
  }
}

function toFull(store: Store, r: Row): Full | null {
  const kind = text(r, "kind");
  const status = text(r, "status");
  if (!isKind(kind) || !isStatus(status)) return null;
  const payload = payloadOf(r);
  const item = store.db
    .prepare("SELECT title, repo, first_activity FROM work_items WHERE item_key = ?")
    .get(text(r, "item_key"));
  if (!item) return null;
  const withKey = kind === "group" && typeof payload["with"] === "string" ? payload["with"] : null;
  let withTitle: string | null = null;
  if (kind === "group") {
    const other = withKey
      ? store.db.prepare("SELECT title FROM work_items WHERE item_key = ?").get(withKey)
      : undefined;
    if (!other) return null; // the other item is gone: nothing to group
    withTitle = text(other, "title");
  }
  const summary =
    kind === "title"
      ? str(payload["title"])
      : kind === "topic"
        ? `${str(payload["topic"])} (${str(payload["kind"])})`
        : `same work as: ${withTitle}`;
  return {
    id: num(r, "id"),
    itemKey: text(r, "item_key"),
    kind,
    status,
    confidence: Number(r["confidence"] ?? 0),
    summary,
    reason: str(payload["reason"]),
    itemTitle: text(item, "title"),
    repo: textOrNull(item, "repo"),
    withKey,
    batchId: textOrNull(r, "batch_id"),
    createdAt: text(r, "created_at"),
    payload,
    withTitle,
    firstActivity: text(item, "first_activity"),
  };
}

function load(store: Store, status: SuggestionStatus, filter: SuggestionFilter): Full[] {
  const where = ["status = ?"];
  const params: (string | number)[] = [status];
  if (filter.kinds && filter.kinds.length > 0) {
    where.push(`kind IN (${filter.kinds.map(() => "?").join(",")})`);
    params.push(...filter.kinds);
  }
  if (filter.minConfidence !== undefined) {
    where.push("confidence >= ?");
    params.push(filter.minConfidence);
  }
  if (filter.ids) {
    where.push(`id IN (${filter.ids.map(() => "?").join(",") || "NULL"})`);
    params.push(...filter.ids);
  }
  const repo = filter.repo?.trim().toLowerCase();
  return store.db
    .prepare(`SELECT * FROM suggestions WHERE ${where.join(" AND ")} ORDER BY id`)
    .all(...params)
    .flatMap((r) => {
      const f = toFull(store, r);
      if (!f) return [];
      if (f.kind === "title" && isExplicitKey(f.itemKey)) return [];
      if (repo && base(f.repo ?? "").toLowerCase() !== repo) return [];
      return [f];
    });
}

const view = ({ payload: _p, withTitle: _w, firstActivity: _f, ...v }: Full): SuggestionView => v;

/** Open suggestions that match, for the review list. Newest id last. */
export function listSuggestions(
  store: Store,
  filter: SuggestionFilter = {},
  status: SuggestionStatus = "suggested",
  limit = 200,
  offset = 0,
): { total: number; rows: SuggestionView[] } {
  const all = load(store, status, filter);
  return { total: all.length, rows: all.slice(offset, offset + limit).map(view) };
}

export interface Preview {
  action: BatchAction;
  total: number;
  byKind: Record<SuggestionKind, number>;
  /** Up to `sample` rows, spread across the selection. */
  sample: SuggestionView[];
  /** Hash of the selection. `applyBatch` refuses a token that no longer matches, so nothing is applied unseen. */
  token: string;
}

const tokenOf = (action: BatchAction, ids: readonly number[]): string =>
  createHash("sha256")
    .update(`${action}:${ids.join(",")}`)
    .digest("hex")
    .slice(0, 24);

/** What a bulk action would touch, with nothing applied. */
export function previewBatch(
  store: Store,
  action: BatchAction,
  filter: SuggestionFilter,
  sample = 8,
): Preview {
  const rows = load(store, "suggested", filter);
  const byKind: Record<SuggestionKind, number> = { title: 0, topic: 0, group: 0 };
  for (const r of rows) byKind[r.kind]++;
  const step = Math.max(1, Math.floor(rows.length / sample));
  const picked = rows.filter((_, i) => i % step === 0).slice(0, sample);
  return {
    action,
    total: rows.length,
    byKind,
    sample: picked.map(view),
    token: tokenOf(
      action,
      rows.map((r) => r.id),
    ),
  };
}

export class StaleSelectionError extends Error {
  constructor() {
    super("The selection changed since the preview. Preview again.");
  }
}

export interface BatchResult {
  batchId: string;
  action: BatchAction;
  counts: Record<SuggestionKind, number>;
  total: number;
}

/** One survivor per group: the item that started first (ties by key). The other item's events get an inferred link to it. */
function survivor(a: Full, otherFirst: string, otherKey: string): { keep: string; fold: string } {
  const aFirst = a.firstActivity < otherFirst || (a.firstActivity === otherFirst && a.itemKey < otherKey);
  return aFirst ? { keep: a.itemKey, fold: otherKey } : { keep: otherKey, fold: a.itemKey };
}

function acceptOne(store: Store, f: Full, batchId: string, at: string): void {
  const db = store.db;
  const payload = { ...f.payload };
  if (f.kind === "title") {
    const cur = db.prepare("SELECT title, title_source FROM work_items WHERE item_key = ?").get(f.itemKey);
    payload["previous"] = cur ? text(cur, "title") : "";
    payload["previousSource"] = cur ? text(cur, "title_source") : "fallback";
    db.prepare("UPDATE work_items SET title = ?, title_source = 'classifier' WHERE item_key = ?").run(
      str(payload["title"]),
      f.itemKey,
    );
  } else if (f.kind === "group" && f.withKey) {
    const other = db.prepare("SELECT first_activity FROM work_items WHERE item_key = ?").get(f.withKey);
    const { keep, fold } = survivor(f, text(other ?? {}, "first_activity"), f.withKey);
    const linked: [number, string][] = [];
    const events = db
      .prepare("SELECT event_id FROM links WHERE item_key = ? AND undone_at IS NULL AND method != 'inferred'")
      .all(fold);
    const ins = db.prepare(
      `INSERT INTO links (event_id, item_key, method, anchor_kind, anchor_value, rule, confidence, created_at)
       VALUES (?, ?, 'inferred', 'classifier', ?, 'classifier-same-as', ?, ?)
       ON CONFLICT (event_id, item_key) DO UPDATE SET undone_at = NULL, method = 'inferred', anchor_value = excluded.anchor_value,
         confidence = excluded.confidence, created_at = excluded.created_at WHERE links.method = 'inferred'`,
    );
    for (const e of events) {
      const id = num(e, "event_id");
      const existing = db
        .prepare("SELECT method, undone_at FROM links WHERE event_id = ? AND item_key = ?")
        .get(id, keep);
      if (existing && (text(existing, "method") !== "inferred" || existing["undone_at"] === null)) continue;
      ins.run(id, keep, batchId, f.confidence, at);
      linked.push([id, keep]);
    }
    payload["linked"] = linked;
    payload["keep"] = keep;
    payload["fold"] = fold;
  }
  db.prepare(
    "UPDATE suggestions SET status = 'accepted', batch_id = ?, decided_at = ?, payload_json = ? WHERE id = ?",
  ).run(batchId, at, JSON.stringify(payload), f.id);
}

/**
 * Accepts or dismisses everything the filter selects, as one batch. `token` must be the one `previewBatch` returned
 * for the same action and filter; otherwise nothing changes and `StaleSelectionError` is thrown.
 */
export function applyBatch(
  store: Store,
  action: BatchAction,
  filter: SuggestionFilter,
  token: string,
  now = new Date(),
): BatchResult {
  return store.transaction(() => {
    const rows = load(store, "suggested", filter);
    if (
      tokenOf(
        action,
        rows.map((r) => r.id),
      ) !== token
    )
      throw new StaleSelectionError();
    const at = now.toISOString();
    const batchId = randomUUID();
    const counts: Record<SuggestionKind, number> = { title: 0, topic: 0, group: 0 };
    for (const f of rows) {
      counts[f.kind]++;
      if (action === "dismiss") {
        store.db
          .prepare("UPDATE suggestions SET status = 'dismissed', batch_id = ?, decided_at = ? WHERE id = ?")
          .run(batchId, at, f.id);
      } else acceptOne(store, f, batchId, at);
    }
    store.db
      .prepare(
        "INSERT INTO suggestion_batches (id, action, filter_json, counts_json, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(batchId, action, JSON.stringify(filter), JSON.stringify(counts), at);
    return { batchId, action, counts, total: rows.length };
  });
}

/** Preview and apply in one call, for the CLI and auto-accept, which show the preview themselves. */
export function applyNow(
  store: Store,
  action: BatchAction,
  filter: SuggestionFilter,
  now = new Date(),
): BatchResult {
  return applyBatch(store, action, filter, previewBatch(store, action, filter).token, now);
}

export interface BatchView {
  id: string;
  action: BatchAction;
  counts: Record<SuggestionKind, number>;
  total: number;
  createdAt: string;
  undone: boolean;
}

function batchView(r: Row): BatchView {
  const counts: Record<SuggestionKind, number> = { title: 0, topic: 0, group: 0 };
  try {
    const parsed: unknown = JSON.parse(text(r, "counts_json"));
    if (isRec(parsed)) {
      for (const k of ["title", "topic", "group"] as const) {
        const n = parsed[k];
        if (typeof n === "number") counts[k] = n;
      }
    }
  } catch {
    // keep zeros
  }
  const action = text(r, "action");
  return {
    id: text(r, "id"),
    action: isAction(action) ? action : "accept",
    counts,
    total: counts.title + counts.topic + counts.group,
    createdAt: text(r, "created_at"),
    undone: r["undone_at"] !== null,
  };
}

export function listBatches(store: Store, limit = 20): BatchView[] {
  return store.db
    .prepare("SELECT * FROM suggestion_batches ORDER BY created_at DESC, rowid DESC LIMIT ?")
    .all(limit)
    .map(batchView);
}

/** The newest batch that is not undone, or null. */
export function lastOpenBatch(store: Store): BatchView | null {
  const r = store.db
    .prepare(
      "SELECT * FROM suggestion_batches WHERE undone_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1",
    )
    .get();
  return r ? batchView(r) : null;
}

/**
 * Reverts exactly one batch: accepted titles go back to the title they replaced (unless the item's title
 * changed since), accepted groups lose their inferred links, dismissed suggestions become open again. Returns
 * null when the batch does not exist or is already undone.
 */
export function undoBatch(store: Store, batchId: string | undefined, now = new Date()): BatchView | null {
  return store.transaction(() => {
    const b = batchId
      ? store.db.prepare("SELECT * FROM suggestion_batches WHERE id = ?").get(batchId)
      : store.db
          .prepare(
            "SELECT * FROM suggestion_batches WHERE undone_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1",
          )
          .get();
    if (!b || b["undone_at"] !== null) return null;
    const at = now.toISOString();
    const id = text(b, "id");
    const dismissed = text(b, "action") === "dismiss";
    for (const r of store.db
      .prepare("SELECT * FROM suggestions WHERE batch_id = ? AND status IN ('accepted','dismissed')")
      .all(id)) {
      const payload = payloadOf(r);
      if (dismissed) {
        store.db
          .prepare(
            "UPDATE suggestions SET status = 'suggested', batch_id = NULL, decided_at = NULL WHERE id = ?",
          )
          .run(num(r, "id"));
        continue;
      }
      if (text(r, "kind") === "title") {
        store.db
          .prepare("UPDATE work_items SET title = ?, title_source = ? WHERE item_key = ? AND title = ?")
          .run(
            str(payload["previous"]),
            str(payload["previousSource"]) || "fallback",
            text(r, "item_key"),
            str(payload["title"]),
          );
      } else if (text(r, "kind") === "group") {
        for (const pair of linkedPairs(payload["linked"])) {
          store.db
            .prepare(
              "UPDATE links SET undone_at = ? WHERE event_id = ? AND item_key = ? AND method = 'inferred' AND undone_at IS NULL",
            )
            .run(at, pair[0], pair[1]);
        }
      }
      store.db
        .prepare("UPDATE suggestions SET status = 'undone', undone_at = ? WHERE id = ?")
        .run(at, num(r, "id"));
    }
    store.db.prepare("UPDATE suggestion_batches SET undone_at = ? WHERE id = ?").run(at, id);
    return { ...batchView(b), undone: true };
  });
}

/** Item key to the title the user accepted (latest, not undone). The stage pass uses it so a pass never undoes an accept. */
export function acceptedTitles(store: Store): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of store.db
    .prepare(
      "SELECT item_key, payload_json FROM suggestions WHERE kind = 'title' AND status = 'accepted' ORDER BY decided_at, id",
    )
    .all()) {
    const t = payloadOf(r)["title"];
    if (typeof t === "string" && t !== "" && !isExplicitKey(text(r, "item_key")))
      out.set(text(r, "item_key"), t);
  }
  return out;
}

/** Item key to its accepted topic and kind, for grouping on the page. */
export function acceptedTopics(store: Store): Map<string, { topic: string; kind: string }> {
  const out = new Map<string, { topic: string; kind: string }>();
  for (const r of store.db
    .prepare(
      "SELECT item_key, payload_json FROM suggestions WHERE kind = 'topic' AND status = 'accepted' ORDER BY decided_at, id",
    )
    .all()) {
    const p = payloadOf(r);
    out.set(text(r, "item_key"), { topic: str(p["topic"]), kind: str(p["kind"]) });
  }
  return out;
}

export interface SuggestionCounts {
  open: Record<SuggestionKind, number>;
  accepted: number;
  dismissed: number;
  undone: number;
}

export function suggestionCounts(store: Store): SuggestionCounts {
  const out: SuggestionCounts = {
    open: { title: 0, topic: 0, group: 0 },
    accepted: 0,
    dismissed: 0,
    undone: 0,
  };
  for (const f of load(store, "suggested", {})) out.open[f.kind]++;
  for (const r of store.db.prepare("SELECT status, COUNT(*) AS n FROM suggestions GROUP BY status").all()) {
    const s = text(r, "status");
    if (s === "accepted" || s === "dismissed" || s === "undone") out[s] = num(r, "n");
  }
  return out;
}
