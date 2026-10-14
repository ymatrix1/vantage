// Synthetic transcript lines and events for every lineage signal (no real data).
import { describe, expect, it } from "vitest";
import {
  linkEvents,
  parseTranscriptLine,
  rootSession,
  sessionLineage,
  transcriptEvents,
  transcriptLineage,
  undoKey,
  type TranscriptLine,
  type VantageEvent,
} from "../src/index.ts";

const line = (sessionId: string, t: string, extra: Record<string, unknown> = {}): TranscriptLine => {
  const raw = JSON.stringify({
    type: "user",
    sessionId,
    uuid: `${sessionId}-${t}`,
    timestamp: `2026-01-05T${t}Z`,
    message: { role: "user", content: "hello" },
    ...extra,
  });
  const parsed = parseTranscriptLine(raw);
  if (!parsed) throw new Error("bad line");
  return parsed;
};

describe("transcriptLineage", () => {
  it("resume: copied history under the parent id, then own lines", () => {
    const events = transcriptLineage(
      [line("s-a", "09:00:00"), line("s-a", "09:01:00"), line("s-b", "10:00:00"), line("s-b", "10:01:00")],
      "s-b",
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "session.derived",
      sessionId: "s-b",
      sourceId: "cc:lineage:s-b:s-a",
      timestamp: "2026-01-05T10:00:00Z",
      payload: { parentSessionId: "s-a", lineage: "continuation", signal: "transcript-history" },
    });
  });
  it("chain: the parent is the last foreign id before the first own line", () => {
    const events = transcriptLineage(
      [line("s-a", "09:00:00"), line("s-b", "10:00:00"), line("s-c", "11:00:00")],
      "s-c",
    );
    expect(events[0]?.payload["parentSessionId"]).toBe("s-b");
  });
  it("no signal: a file with only its own lines derives from nothing", () => {
    expect(transcriptLineage([line("s-a", "09:00:00"), line("s-a", "09:01:00")], "s-a")).toEqual([]);
  });
  it("compaction keeps the session id, so it is no signal", () => {
    const lines = [line("s-a", "09:00:00"), line("s-a", "09:30:00", { logicalParentUuid: "x" })];
    expect(transcriptLineage(lines, "s-a")).toEqual([]);
  });
  it("sidechain: sub-agent lines carry the parent id, so they are no signal", () => {
    const lines = [line("s-a", "09:00:00", { isSidechain: true, agentId: "ag1" })];
    expect(transcriptLineage(lines, "s-a")).toEqual([]);
  });
  it("ignores foreign lines with no own line after them", () => {
    expect(transcriptLineage([line("s-a", "09:00:00")], "s-b")).toEqual([]);
  });
});

describe("sub-agent runs", () => {
  it("tool calls from a sidechain keep the parent's session id and carry the agent id", () => {
    const assistant = parseTranscriptLine(
      JSON.stringify({
        type: "assistant",
        sessionId: "s-a",
        agentId: "ag1",
        isSidechain: true,
        uuid: "u1",
        timestamp: "2026-01-05T09:00:00Z",
        message: { content: [{ type: "tool_use", id: "t1", name: "Edit", input: { file_path: "/w/a.ts" } }] },
      }),
    );
    const events = transcriptEvents(assistant ? [assistant] : []);
    expect(events[0]).toMatchObject({ kind: "file.edited", sessionId: "s-a", payload: { agentId: "ag1" } });
  });
});

const ev = (
  sourceId: string,
  kind: VantageEvent["kind"],
  sessionId: string,
  t: string,
  payload: Record<string, unknown> = {},
): VantageEvent => ({
  sourceId,
  source: "claude_code",
  kind,
  timestamp: `2026-01-05T${t}Z`,
  sessionId,
  payload,
});
const derived = (child: string, parent: string, t = "10:00:00"): VantageEvent =>
  ev(`d-${child}`, "session.derived", child, t, { parentSessionId: parent, lineage: "continuation" });

describe("sessionLineage", () => {
  it("takes the kind from the SessionStart source, else continuation", () => {
    const m = sessionLineage([
      derived("s-b", "s-a"),
      ev("h1", "session.started", "s-b", "10:00:00", { start: "resume" }),
      derived("s-c", "s-a"),
      ev("h2", "session.started", "s-c", "10:00:00", { start: "fork" }),
      derived("s-d", "s-a"),
      ev("h3", "session.started", "s-d", "10:00:00", { start: "clear" }),
      derived("s-e", "s-a"),
    ]);
    expect(m.get("s-b")?.lineage).toBe("resume");
    expect(m.get("s-c")?.lineage).toBe("fork");
    expect(m.get("s-d")?.lineage).toBe("continuation");
    expect(m.get("s-e")).toEqual({ parentSessionId: "s-a", lineage: "continuation" });
  });
  it("finds the root and survives a cycle", () => {
    const m = sessionLineage([derived("s-b", "s-a"), derived("s-c", "s-b")]);
    expect(rootSession("s-c", m)).toBe("s-a");
    const loop = sessionLineage([derived("s-a", "s-b"), derived("s-b", "s-a")]);
    expect(["s-a", "s-b"]).toContain(rootSession("s-a", loop));
  });
});

describe("linker: derived sessions", () => {
  const edit = (id: string, sid: string, t: string, extra: Record<string, unknown> = {}): VantageEvent =>
    ev(id, "file.edited", sid, t, { cwd: "/w/unscanned", ...extra });
  const base: VantageEvent[] = [
    edit("a1", "s-a", "09:00:00"),
    edit("b1", "s-b", "10:01:00"),
    ev("b2", "prompt.submitted", "s-b", "10:02:00"),
    derived("s-b", "s-a"),
    edit("c1", "s-c", "11:00:00"), // no signal: stays its own item
    edit("a2", "s-a", "09:05:00", { agentId: "ag1" }), // sub-agent run: already the parent's session
  ];

  it("attaches a resumed session's events, even without edits, to the parent's provisional item", () => {
    const r = linkEvents(base);
    const item = (id: string) => r.links.find((l) => l.eventSourceId === id);
    expect(item("a1")).toMatchObject({ itemKey: "session:s-a", rule: "provisional-session" });
    expect(item("b1")).toMatchObject({ itemKey: "session:s-a", rule: "derived-session" });
    expect(item("b2")?.itemKey).toBe("session:s-a");
    expect(item("d-s-b")?.itemKey).toBe("session:s-a");
    expect(item("a2")?.itemKey).toBe("session:s-a");
    expect(item("c1")?.itemKey).toBe("session:s-c");
  });
  it("a chain resolves to the root", () => {
    const r = linkEvents([...base, edit("d1", "s-d", "12:00:00"), derived("s-d", "s-b", "12:00:00")]);
    expect(r.links.find((l) => l.eventSourceId === "d1")?.itemKey).toBe("session:s-a");
  });
  it("sessions with no signal are not grouped (no heuristic)", () => {
    const r = linkEvents([edit("x1", "s-x", "09:00:00"), edit("y1", "s-y", "09:10:00")]);
    expect(new Set(r.links.map((l) => l.itemKey))).toEqual(new Set(["session:s-x", "session:s-y"]));
  });
  it("a derived session with no edits in a family with no edits stays unlinked", () => {
    const r = linkEvents([ev("p1", "prompt.submitted", "s-b", "10:00:00"), derived("s-b", "s-a")]);
    expect(r.links).toEqual([]);
    expect(r.unlinked.map((u) => u.reason)).toEqual(["no-anchor", "no-anchor"]);
  });
  it("unanchored events of a derived session join the item its family is anchored to", () => {
    const git: VantageEvent = {
      source: "git",
      sourceId: "g1",
      kind: "worktree.scanned",
      timestamp: "2026-01-05T08:00:00Z",
      payload: { worktree: "/w/wt", branch: "feat/ftk-3-x" },
    };
    const r = linkEvents([
      git,
      edit("a1", "s-a", "09:00:00", { cwd: "/w/wt" }),
      edit("b1", "s-b", "10:01:00"), // the child's cwd is unknown to git: no anchor of its own
      derived("s-b", "s-a"),
    ]);
    expect(r.links.find((l) => l.eventSourceId === "a1")).toMatchObject({ itemKey: "issue:FTK-3" });
    expect(r.links.find((l) => l.eventSourceId === "b1")).toMatchObject({
      itemKey: "issue:FTK-3",
      rule: "derived-session",
      anchor: { kind: "issue_key", value: "FTK-3" },
    });
  });
  it("a derived session with its own anchor keeps it (anchors beat lineage)", () => {
    const r = linkEvents([
      edit("a1", "s-a", "09:00:00"),
      edit("b1", "s-b", "10:00:00", { branch: "feat/other" }),
      derived("s-b", "s-a"),
    ]);
    expect(r.links.find((l) => l.eventSourceId === "b1")?.itemKey).toBe("branch::feat/other");
  });
  it("undo is per event and item: an undone child link is never re-created", () => {
    const undone = new Set([undoKey("claude_code", "b1", "session:s-a")]);
    const r = linkEvents(base, { undone });
    expect(r.links.find((l) => l.eventSourceId === "b1")).toBeUndefined();
    expect(r.unlinked).toContainEqual({ eventSource: "claude_code", eventSourceId: "b1", reason: "undone" });
    expect(r.links.find((l) => l.eventSourceId === "b2")?.itemKey).toBe("session:s-a");
  });
});
