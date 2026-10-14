// Event catalog v1. Source of truth: docs/specs/ingestion.md#event-catalog-v1

export const EVENT_KINDS = {
  agent: [
    "session.started",
    "session.derived",
    "prompt.submitted",
    "file.edited",
    "command.ran",
    "todo.updated",
    "session.waiting",
    "session.stopped",
    "session.compacted",
    "session.ended",
  ],
  git: ["commit.created", "branch.checked_out", "merge.completed", "revert.created", "worktree.scanned"],
  review: [
    "pr.opened",
    "pr.updated",
    "review.submitted",
    "review.requested",
    "thread.commented",
    "thread.resolved",
    "pr.merged",
    "pr.closed",
  ],
  ship: [
    "deploy.started",
    "deploy.succeeded",
    "deploy.failed",
    "check.passed",
    "check.failed",
    "alert.fired",
    "alert.resolved",
    "incident.opened",
  ],
  tracker: ["issue.assigned", "issue.updated", "issue.commented", "issue.transitioned"],
  people: ["mention.received", "message.sent_by_user", "reply.received", "reaction.added"],
} as const;

export type EventGroup = keyof typeof EVENT_KINDS;
export type EventKind = (typeof EVENT_KINDS)[EventGroup][number];

const ALL_KINDS: ReadonlySet<string> = new Set(Object.values(EVENT_KINDS).flat());

export function isEventKind(value: string): value is EventKind {
  return ALL_KINDS.has(value);
}

/** An immutable fact from a source (docs/specs/work-item-model.md). */
export interface VantageEvent {
  /** Stable id from the source, used to deduplicate push and pull (ingestion principle 4). */
  sourceId: string;
  source: string;
  kind: EventKind;
  /** ISO 8601 timestamp of when it happened at the source. */
  timestamp: string;
  sessionId?: string;
  /** Raw source fields, kept as received. */
  payload: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parses one spool or fixture line; returns null for anything that isn't a valid event. */
export function parseEvent(line: string): VantageEvent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;
  const e = raw;
  if (
    typeof e["sourceId"] !== "string" ||
    typeof e["source"] !== "string" ||
    typeof e["kind"] !== "string" ||
    !isEventKind(e["kind"]) ||
    typeof e["timestamp"] !== "string" ||
    Number.isNaN(Date.parse(e["timestamp"])) ||
    !isRecord(e["payload"])
  ) {
    return null;
  }
  const event: VantageEvent = {
    sourceId: e["sourceId"],
    source: e["source"],
    kind: e["kind"],
    timestamp: e["timestamp"],
    payload: e["payload"],
  };
  if (typeof e["sessionId"] === "string") event.sessionId = e["sessionId"];
  return event;
}
