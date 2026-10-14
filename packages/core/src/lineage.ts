// Derived sessions: sessions that carry on another session's work (docs/specs/work-item-model.md).
// Only explicit signals count. The transcript signal is history copied from another session: Claude
// Code writes a resumed, forked or continued session into a new file whose first lines keep the
// parent's `sessionId`. Sub-agent runs are not separate sessions: their lines carry the parent's
// `sessionId` plus an `agentId`, so they already join the parent (see `agentId` on events).
import { SOURCE } from "./claude-code.ts";
import type { TranscriptLine } from "./claude-code.ts";
import type { VantageEvent } from "./events.ts";

export type LineageKind = "subagent" | "resume" | "continuation" | "fork";

export interface SessionLineage {
  parentSessionId: string;
  /** `continuation` when history was carried over and no hook said how (`resume`, `fork`). */
  lineage: Exclude<LineageKind, "subagent">;
}

/**
 * `session.derived` events for one transcript file. `ownSessionId` is the session the file belongs to
 * (its file name). A session whose file starts with lines stamped with another session id derives from
 * the id on the last such line (the immediate parent; a chain resolves through `sessionLineage`).
 * Pass every parsed line of the file, not only the ones inside the backfill window: the copied history
 * is usually older than the window.
 */
export function transcriptLineage(lines: readonly TranscriptLine[], ownSessionId: string): VantageEvent[] {
  let parent: string | undefined;
  for (const l of lines) {
    if (!l.sessionId) continue;
    if (l.sessionId !== ownSessionId) {
      parent = l.sessionId;
      continue;
    }
    if (!l.timestamp || Number.isNaN(Date.parse(l.timestamp))) continue;
    if (!parent) return []; // own lines came first: nothing was carried over
    return [
      {
        source: SOURCE,
        sourceId: `cc:lineage:${ownSessionId}:${parent}`,
        kind: "session.derived",
        timestamp: l.timestamp,
        sessionId: ownSessionId,
        payload: { parentSessionId: parent, lineage: "continuation", signal: "transcript-history" },
      },
    ];
  }
  return [];
}

const HOOK_LINEAGE: Record<string, SessionLineage["lineage"]> = {
  resume: "resume",
  fork: "fork",
  clear: "continuation",
  compact: "continuation",
};

/**
 * Parent and kind of every derived session, from `session.derived` events. A `SessionStart` source
 * (`resume`, `fork`, `clear`, `compact`) names the kind when the hook saw the session start.
 */
export function sessionLineage(events: readonly VantageEvent[]): Map<string, SessionLineage> {
  const started = new Map<string, string>();
  for (const e of events) {
    const start = e.payload["start"];
    if (e.kind === "session.started" && e.sessionId && typeof start === "string")
      started.set(e.sessionId, start);
  }
  const out = new Map<string, SessionLineage>();
  for (const e of events) {
    const parent = e.payload["parentSessionId"];
    if (e.kind !== "session.derived" || !e.sessionId || typeof parent !== "string" || parent === "") continue;
    if (parent === e.sessionId || out.has(e.sessionId)) continue;
    const hook = HOOK_LINEAGE[started.get(e.sessionId) ?? ""];
    out.set(e.sessionId, { parentSessionId: parent, lineage: hook ?? "continuation" });
  }
  return out;
}

/** Root of a session's chain of parents. Cycles stop at the first repeat. */
export function rootSession(sessionId: string, lineage: ReadonlyMap<string, SessionLineage>): string {
  const seen = new Set<string>([sessionId]);
  let cur = sessionId;
  for (;;) {
    const next = lineage.get(cur)?.parentSessionId;
    if (next === undefined || seen.has(next)) return cur;
    seen.add(next);
    cur = next;
  }
}
