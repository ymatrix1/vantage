// Task lists (TodoWrite) and sub-agent runs from synthetic hook payloads and transcript lines (D94).
import { describe, expect, it } from "vitest";
import {
  cleanTaskText,
  hookEvents,
  parseTranscriptLine,
  todoCounts,
  transcriptEvents,
  type TranscriptLine,
} from "../src/index.ts";

describe("cleanTaskText", () => {
  it("drops URLs, paths, emails and secret-looking tokens and keeps one line", () => {
    // Built at run time so the repo privacy scan does not read the fake values as real ones.
    const email = ["a", "b.co"].join("@");
    const key = ["sk", "abcdefghijklmnop1234"].join("-");
    const t = cleanTaskText(
      `Fix the **linker**\n see https://internal.example/x and C:\\work\\a.ts or /srv/app/b.ts, mail ${email} key ${key}`,
    );
    expect(t).toBe("Fix the linker see and or mail key");
  });
  it("caps at 80 characters on a word boundary", () => {
    const t = cleanTaskText("word ".repeat(40)) ?? "";
    expect(t.length).toBeLessThanOrEqual(80);
    expect(t.endsWith("…")).toBe(true);
  });
  it("returns undefined when nothing is left", () => {
    expect(cleanTaskText("  https://x.example/y  ")).toBeUndefined();
  });
});

describe("todoCounts", () => {
  const input = {
    todos: [
      { content: "Done one", status: "completed", activeForm: "Doing one" },
      { content: "Write the linker rule", status: "in_progress", activeForm: "Writing" },
      { content: "Second in progress", status: "in_progress", activeForm: "x" },
      { content: "Later thing", status: "pending", activeForm: "y" },
    ],
  };
  it("counts per status and keeps the first in_progress text", () => {
    expect(todoCounts(input, true)).toEqual({
      total: 4,
      pending: 1,
      inProgress: 2,
      completed: 1,
      current: "Write the linker rule",
    });
  });
  it("keeps counts but no text when text capture is off", () => {
    const c = todoCounts(input, false);
    expect(c).toMatchObject({ total: 4, completed: 1 });
    expect(c).not.toHaveProperty("current");
  });
  it("is null for an input that is not a task list", () => {
    expect(todoCounts({ nope: 1 }, true)).toBeNull();
  });
});

const hook = (input: object, id = "toolu_1") => ({
  v: 1 as const,
  receivedAt: "2026-01-05T09:00:00.000Z",
  hook: {
    hook_event_name: "PostToolUse",
    session_id: "s-1",
    tool_use_id: id,
    tool_name: "TodoWrite",
    tool_input: input,
  },
});

describe("task.list.updated", () => {
  const list = {
    todos: [
      { content: "Secret plan details we must not keep", status: "pending", activeForm: "a" },
      { content: "Current thing", status: "in_progress", activeForm: "b" },
    ],
  };
  it("comes from a hook payload with counts and the current task only", () => {
    const [e] = hookEvents(hook(list));
    expect(e).toMatchObject({
      kind: "task.list.updated",
      sourceId: "cc:tool:toolu_1:todos",
      sessionId: "s-1",
      payload: { total: 2, pending: 1, inProgress: 1, completed: 0, current: "Current thing" },
    });
    expect(JSON.stringify(e?.payload)).not.toContain("Secret plan");
  });
  it("honours the text switch", () => {
    const [e] = hookEvents(hook(list), { taskText: false });
    expect(e?.payload).not.toHaveProperty("current");
    expect(e?.payload["total"]).toBe(2);
  });
  it("transcript and hook share one id, so they dedupe", () => {
    const line = parseTranscriptLine(
      JSON.stringify({
        type: "assistant",
        sessionId: "s-1",
        uuid: "u1",
        timestamp: "2026-01-05T09:00:00Z",
        message: { content: [{ type: "tool_use", id: "toolu_1", name: "TodoWrite", input: list }] },
      }),
    );
    const ev = transcriptEvents(line ? [line] : []);
    expect(ev.map((e) => e.sourceId)).toEqual(["cc:tool:toolu_1:todos"]);
  });
});

const sub = (agentId: string, t: string, tools: number, sid = "s-1"): TranscriptLine => {
  const line = parseTranscriptLine(
    JSON.stringify({
      type: "assistant",
      sessionId: sid,
      agentId,
      isSidechain: true,
      uuid: `${agentId}-${t}`,
      timestamp: `2026-01-05T${t}Z`,
      message: {
        content: Array.from({ length: tools }, (_, i) => ({
          type: "tool_use",
          id: `${agentId}-${t}-${i}`,
          name: "Read",
          input: {},
        })),
      },
    }),
  );
  if (!line) throw new Error("bad line");
  return line;
};

describe("subagent.run", () => {
  it("one event per agent per batch with the span and the tool count, on the parent's session", () => {
    const ev = transcriptEvents([
      sub("ag1", "09:00:00", 2),
      sub("ag1", "09:03:00", 1),
      sub("ag2", "09:01:00", 4),
    ]).filter((e) => e.kind === "subagent.run");
    expect(ev).toHaveLength(2);
    expect(ev.find((e) => e.payload["agentId"] === "ag1")).toMatchObject({
      sessionId: "s-1",
      timestamp: "2026-01-05T09:00:00Z",
      payload: { startedAt: "2026-01-05T09:00:00Z", endedAt: "2026-01-05T09:03:00Z", tools: 3 },
    });
  });
  it("a later batch of the same agent has its own id", () => {
    const a = transcriptEvents([sub("ag1", "09:00:00", 1)]).find((e) => e.kind === "subagent.run");
    const b = transcriptEvents([sub("ag1", "09:10:00", 1)]).find((e) => e.kind === "subagent.run");
    expect(a?.sourceId).not.toBe(b?.sourceId);
  });
  it("no agent id, no run", () => {
    const line = parseTranscriptLine(
      JSON.stringify({
        type: "assistant",
        sessionId: "s-1",
        uuid: "u",
        timestamp: "2026-01-05T09:00:00Z",
        message: { content: [] },
      }),
    );
    expect(transcriptEvents(line ? [line] : []).filter((e) => e.kind === "subagent.run")).toEqual([]);
  });
});
