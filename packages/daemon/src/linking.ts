// Applies the pure linker (@vantage/core) to the stored events and persists the links.
// The linker replays every event each pass, so results never depend on arrival order; links the
// user undid are kept as tombstones and never re-created (docs/specs/work-item-model.md).
import { linkEvents, parseEvent, undoKey } from "@vantage/core";
import type { LinkOptions, LinkResult, VantageEvent } from "@vantage/core";
import type { Store } from "./store.ts";

export interface StoredLink {
  eventId: number;
  itemKey: string;
  rule: string;
  anchorKind: string;
  anchorValue: string;
  undoneAt: string | null;
}

type Row = Record<string, unknown>;

const text = (r: Row, col: string): string => {
  const v = r[col];
  return typeof v === "string" ? v : "";
};
const num = (r: Row, col: string): number => Number(r[col] ?? 0);
const textOrNull = (r: Row, col: string): string | null => {
  const v = r[col];
  return typeof v === "string" ? v : null;
};

export function loadEvents(store: Store): { ids: Map<string, number>; events: VantageEvent[] } {
  const rows = store.db
    .prepare(
      `SELECT e.id, e.source, e.source_id, e.kind, e.occurred_at, e.session_id, e.payload_json, b.branch AS stored_branch
       FROM events e LEFT JOIN event_branches b ON b.source = e.source AND b.source_id = e.source_id
       ORDER BY e.occurred_at, e.id`,
    )
    .all();
  const ids = new Map<string, number>();
  const events: VantageEvent[] = [];
  for (const r of rows) {
    const sessionId = textOrNull(r, "session_id");
    const payload: Record<string, unknown> = JSON.parse(text(r, "payload_json"));
    // A branch recorded beside the event fills a payload that has none (D88); the payload stays as stored.
    const stored = textOrNull(r, "stored_branch");
    if (stored && !("branch" in payload)) payload["branch"] = stored;
    const e = parseEvent(
      JSON.stringify({
        sourceId: text(r, "source_id"),
        source: text(r, "source"),
        kind: text(r, "kind"),
        timestamp: text(r, "occurred_at"),
        ...(sessionId ? { sessionId } : {}),
        payload,
      }),
    );
    if (!e) continue;
    ids.set(`${text(r, "source")}|${text(r, "source_id")}`, num(r, "id"));
    events.push(e);
  }
  return { ids, events };
}

function undoneKeys(store: Store, ids: Map<string, number>): Set<string> {
  const byId = new Map([...ids].map(([k, id]) => [id, k]));
  const rows = store.db.prepare("SELECT event_id, item_key FROM links WHERE undone_at IS NOT NULL").all();
  const out = new Set<string>();
  for (const r of rows) {
    const k = byId.get(num(r, "event_id"));
    if (!k) continue;
    const [source = "", ...rest] = k.split("|");
    out.add(undoKey(source, rest.join("|"), text(r, "item_key")));
  }
  return out;
}

/** Re-links every stored event. Live links are rewritten; undone links stay undone. */
export function linkStoredEvents(
  store: Store,
  opts: Omit<LinkOptions, "undone"> = {},
  now = new Date(),
): LinkResult {
  const { ids, events } = loadEvents(store);
  const result = linkEvents(events, { ...opts, undone: undoneKeys(store, ids) });
  const at = now.toISOString();
  store.transaction(() => {
    store.db.exec("DELETE FROM links WHERE undone_at IS NULL");
    const ins = store.db.prepare(
      `INSERT OR IGNORE INTO links (event_id, item_key, method, anchor_kind, anchor_value, rule, confidence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const l of result.links) {
      const id = ids.get(`${l.eventSource}|${l.eventSourceId}`);
      if (id !== undefined)
        ins.run(id, l.itemKey, l.method, l.anchor.kind, l.anchor.value, l.rule, l.confidence, at);
    }
  });
  return result;
}

/** Marks one link undone. Returns false when no live link matches. */
export function undoLink(store: Store, eventId: number, itemKey: string, now = new Date()): boolean {
  const r = store.db
    .prepare("UPDATE links SET undone_at = ? WHERE event_id = ? AND item_key = ? AND undone_at IS NULL")
    .run(now.toISOString(), eventId, itemKey);
  return Number(r.changes) > 0;
}

/** Links of one item, live and undone, oldest event first. */
export function linksForItem(store: Store, itemKey: string): StoredLink[] {
  const rows = store.db
    .prepare(
      "SELECT event_id, item_key, rule, anchor_kind, anchor_value, undone_at FROM links WHERE item_key = ? ORDER BY event_id",
    )
    .all(itemKey);
  return rows.map((r) => ({
    eventId: num(r, "event_id"),
    itemKey: text(r, "item_key"),
    rule: text(r, "rule"),
    anchorKind: text(r, "anchor_kind"),
    anchorValue: text(r, "anchor_value"),
    undoneAt: textOrNull(r, "undone_at"),
  }));
}
