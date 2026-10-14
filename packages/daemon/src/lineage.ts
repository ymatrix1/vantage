// Per-item session counts for the Track view (docs/specs/work-item-model.md#derived-sessions).
// Read from the `item_sessions` view, so they follow live links and respect undo.
import type { Store } from "./store.ts";

export interface ItemSessionCounts {
  itemKey: string;
  /** Sessions with a live link to the item, derived ones included. */
  sessionCount: number;
  /** Of those, sessions that continue another session (resume, fork, continuation). */
  derivedCount: number;
  /** Distinct sub-agent runs inside the item's sessions. They share their parent's session id. */
  subagentCount: number;
}

/** Counts for one item, or all items when `itemKey` is omitted. An item with no linked session is absent. */
export function itemSessionCounts(store: Store, itemKey?: string): Map<string, ItemSessionCounts> {
  const sql =
    "SELECT item_key, session_count, derived_count, subagent_count FROM item_sessions" +
    (itemKey === undefined ? "" : " WHERE item_key = ?");
  const stmt = store.db.prepare(sql);
  const rows = itemKey === undefined ? stmt.all() : stmt.all(itemKey);
  const out = new Map<string, ItemSessionCounts>();
  for (const r of rows) {
    const key = String(r["item_key"]);
    out.set(key, {
      itemKey: key,
      sessionCount: Number(r["session_count"]),
      derivedCount: Number(r["derived_count"]),
      subagentCount: Number(r["subagent_count"]),
    });
  }
  return out;
}
