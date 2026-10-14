// Read-only views behind the HTTP API (docs/specs/web-ui.md#api-daemon-to-ui). Pure reads over the
// derived tables: nothing here writes.
import {
  ATTENTION_LABEL,
  ATTENTION_ORDER,
  STALE_PASS_MS,
  attentionOf,
  type DiagnosticsResponse,
  type SourceHealth,
  type TraceResponse,
  type TrackItem,
  type TrackResponse,
} from "@vantage/core";
import { linksForItem } from "./linking.ts";
import { getItem, listItems } from "./stages.ts";
import type { Store } from "./store.ts";

/** Sources the product plans for; those with no events yet show as unconfigured (hollow). */
const KNOWN_SOURCES = ["claude_code", "git", "github", "ci", "tracker", "slack"];

function sourceHealth(store: Store): SourceHealth[] {
  const seen = new Map<string, SourceHealth>();
  for (const r of store.db
    .prepare("SELECT source, COUNT(*) AS n, MAX(occurred_at) AS last FROM events GROUP BY source")
    .all()) {
    const source = String(r["source"]);
    seen.set(source, {
      source,
      state: "ok",
      events: Number(r["n"]),
      lastEventAt: typeof r["last"] === "string" ? r["last"] : null,
    });
  }
  const out = KNOWN_SOURCES.map(
    (s): SourceHealth => seen.get(s) ?? { source: s, state: "unconfigured", events: 0, lastEventAt: null },
  );
  for (const [s, h] of seen) if (!KNOWN_SOURCES.includes(s)) out.push(h);
  return out;
}

function lastPassAt(store: Store): string | null {
  const v = store.db.prepare("SELECT MAX(updated_at) AS t FROM work_items").get()?.["t"];
  return typeof v === "string" ? v : null;
}

export function trackView(store: Store, now = new Date()): TrackResponse {
  const items: TrackItem[] = listItems(store).map((i) => ({
    id: i.itemKey,
    title: i.title,
    repo: i.repo,
    stage: i.stage,
    proofStatus: i.proofStatus,
    proofLevel: i.proofLevel,
    docsOnly: i.docsOnly,
    flags: i.flags.map((f) => ({ kind: f.kind, severity: f.severity, reason: f.reason })),
    lastActivity: i.lastActivity,
  }));
  const groups = ATTENTION_ORDER.map((attention) => ({
    attention,
    label: ATTENTION_LABEL[attention],
    items: items.filter((i) => attentionOf(i) === attention),
  }));
  const pass = lastPassAt(store);
  return {
    generatedAt: now.toISOString(),
    lastPassAt: pass,
    stale: pass !== null && now.getTime() - Date.parse(pass) > STALE_PASS_MS,
    groups,
    sources: sourceHealth(store),
  };
}

/** Why an item looks the way it does (D45): linked events with the rule that linked them, stage history and proofs. */
export function traceView(store: Store, id: string): TraceResponse | null {
  const item = getItem(store, id);
  if (!item) return null;
  const events = linksForItem(store, id).map((l) => {
    const e = store.db.prepare("SELECT source, kind, occurred_at FROM events WHERE id = ?").get(l.eventId);
    return {
      eventId: l.eventId,
      source: String(e?.["source"] ?? ""),
      kind: String(e?.["kind"] ?? ""),
      occurredAt: String(e?.["occurred_at"] ?? ""),
      rule: l.rule,
      undone: l.undoneAt !== null,
    };
  });
  return {
    id,
    events,
    transitions: item.transitions,
    flags: item.flags.map((f) => ({
      kind: f.kind,
      severity: f.severity,
      reason: f.reason,
      raisedAt: f.raisedAt,
    })),
    proofs: item.proofs.map((p) => ({
      eventId: p.eventId,
      level: p.level,
      state: p.state,
      weakReason: p.weakReason,
      command: p.command,
      ranAt: p.ranAt,
    })),
  };
}

export function diagnosticsView(store: Store, now = new Date()): DiagnosticsResponse {
  const v = store.db.prepare("SELECT version FROM schema_meta").get()?.["version"];
  return {
    generatedAt: now.toISOString(),
    sources: sourceHealth(store),
    events: store.countEvents(),
    items: Number(store.db.prepare("SELECT COUNT(*) AS n FROM work_items").get()?.["n"] ?? 0),
    lastPassAt: lastPassAt(store),
    schemaVersion: Number(v ?? 0),
  };
}
