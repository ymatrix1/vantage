// Per-item read model for the Track view (docs/specs/work-item-model.md#derived-sessions).
// Read from the `item_sessions` and `item_tasks` views, so they follow live links and respect undo.
import type { Store } from "./store.ts";

export interface ItemSessionCounts {
  itemKey: string;
  /** Sessions with a live link to the item, derived ones included. */
  sessionCount: number;
  /** Of those, sessions that continue another session (resume, fork, continuation). */
  derivedCount: number;
  /** Derived sessions the `SessionStart` hook said were forks. Explicit signal only. */
  forkCount: number;
  /** Derived sessions the `SessionStart` hook said were resumes. Explicit signal only. */
  resumeCount: number;
  /** Derived sessions whose parent kept producing events after the child started. A hint, not a rule. */
  forkHintCount: number;
  /** Distinct sub-agent runs inside the item's sessions. They share their parent's session id. */
  subagentRuns: number;
  /** Tool calls made by those runs. */
  subagentTools: number;
}

export interface ItemTasks {
  itemKey: string;
  /** Sum over the item's sessions of the latest task list's size. */
  tasksTotal: number;
  tasksDone: number;
  /** Cleaned text of the in_progress task in the most recent list that has one, at most 80 characters. */
  currentTask: string | null;
}

const n = (v: unknown): number => Number(v ?? 0);

/** Counts for one item, or all items when `itemKey` is omitted. An item with no linked session is absent. */
export function itemSessionCounts(store: Store, itemKey?: string): Map<string, ItemSessionCounts> {
  const sql = "SELECT * FROM item_sessions" + (itemKey === undefined ? "" : " WHERE item_key = ?");
  const stmt = store.db.prepare(sql);
  const rows = itemKey === undefined ? stmt.all() : stmt.all(itemKey);
  const out = new Map<string, ItemSessionCounts>();
  for (const r of rows) {
    const key = String(r["item_key"]);
    out.set(key, {
      itemKey: key,
      sessionCount: n(r["session_count"]),
      derivedCount: n(r["derived_count"]),
      forkCount: n(r["fork_count"]),
      resumeCount: n(r["resume_count"]),
      forkHintCount: n(r["fork_hint_count"]),
      subagentRuns: n(r["subagent_count"]),
      subagentTools: n(r["subagent_tools"]),
    });
  }
  return out;
}

/** The agent's task list per item. An item whose sessions never wrote a task list is absent. */
export function itemTasks(store: Store, itemKey?: string): Map<string, ItemTasks> {
  const sql = "SELECT * FROM item_tasks" + (itemKey === undefined ? "" : " WHERE item_key = ?");
  const stmt = store.db.prepare(sql);
  const rows = itemKey === undefined ? stmt.all() : stmt.all(itemKey);
  const out = new Map<string, ItemTasks>();
  for (const r of rows) {
    const key = String(r["item_key"]);
    const cur = r["current_task"];
    out.set(key, {
      itemKey: key,
      tasksTotal: n(r["tasks_total"]),
      tasksDone: n(r["tasks_done"]),
      currentTask: typeof cur === "string" ? cur : null,
    });
  }
  return out;
}
