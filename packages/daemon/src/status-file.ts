// Writes the small summary file the status line command reads (docs/specs/status-line.md). The
// status line never opens the database or calls the daemon, so it stays fast and still prints
// something calm when the daemon is down.
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { isProofStatus, isStage } from "@vantage/core";
import type { StatusItem, StatusSummary } from "@vantage/core";
import { listItems } from "./stages.ts";
import type { Store } from "./store.ts";

/** Sessions with no activity for this long are left out, so the file stays small. */
export const STATUS_SESSION_DAYS = 7;

/** Builds the summary: needs-you count across all items, and the item each recent session works on. */
export function buildStatusSummary(store: Store, now = new Date()): StatusSummary {
  const items = listItems(store);
  const byKey = new Map(items.map((i) => [i.itemKey, i]));
  const since = new Date(now.getTime() - STATUS_SESSION_DAYS * 86_400_000).toISOString();
  // For each session, the linked item with the latest event wins.
  const rows = store.db
    .prepare(
      `SELECT e.session_id AS session_id, l.item_key AS item_key, MAX(e.occurred_at) AS last
         FROM links l JOIN events e ON e.id = l.event_id
        WHERE l.undone_at IS NULL AND l.method != 'inferred' AND e.session_id IS NOT NULL AND e.occurred_at >= ?
        GROUP BY e.session_id, l.item_key
        ORDER BY last, l.item_key`,
    )
    .all(since);
  const sessions: Record<string, StatusItem> = {};
  for (const r of rows) {
    const item = byKey.get(String(r["item_key"]));
    if (!item || !isStage(item.stage)) continue;
    sessions[String(r["session_id"])] = {
      stage: item.stage,
      proofStatus: isProofStatus(item.proofStatus) ? item.proofStatus : "none",
      proofLevel: item.proofLevel,
      docsOnly: item.docsOnly,
      repo: item.repo,
      title: item.title,
      flags: item.flags.map((f) => f.kind),
    };
  }
  return {
    v: 1,
    writtenAt: now.toISOString(),
    // Same rule as the Track page: a lone `forgotten` flag is low urgency, not "needs you" (D94, D180).
    needsYou: items.filter((i) => i.flags.some((f) => f.kind !== "forgotten")).length,
    pings: 0,
    sessions,
  };
}

/** Atomic write (temp file, then rename), so a reader never sees half a file. */
export function writeStatusFile(store: Store, path: string, now = new Date()): StatusSummary {
  const summary = buildStatusSummary(store, now);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(summary));
  renameSync(tmp, path);
  return summary;
}
