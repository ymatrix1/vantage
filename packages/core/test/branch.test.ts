// Branch stamping on transcript tool events (D92). All lines are synthetic.
import { describe, expect, it } from "vitest";
import { linkEvents, parseTranscriptLine, transcriptEvents, type TranscriptLine } from "../src/index.ts";

let n = 0;
const assistant = (t: string, extra: Record<string, unknown> = {}): TranscriptLine => {
  n++;
  const raw = JSON.stringify({
    type: "assistant",
    sessionId: "s-1",
    uuid: `u${n}`,
    timestamp: `2026-01-05T${t}Z`,
    cwd: "/w/repo",
    message: {
      content: [
        { type: "tool_use", id: `edit${n}`, name: "Edit", input: { file_path: "/w/repo/a.ts" } },
        { type: "tool_use", id: `cmd${n}`, name: "Bash", input: { command: "pnpm test" } },
      ],
    },
    ...extra,
  });
  const p = parseTranscriptLine(raw);
  if (!p) throw new Error("bad line");
  return p;
};
const user = (t: string, extra: Record<string, unknown> = {}): TranscriptLine => {
  n++;
  const p = parseTranscriptLine(
    JSON.stringify({
      type: "user",
      sessionId: "s-1",
      uuid: `u${n}`,
      timestamp: `2026-01-05T${t}Z`,
      message: { content: "go" },
      ...extra,
    }),
  );
  if (!p) throw new Error("bad line");
  return p;
};
const branchOf = (events: ReturnType<typeof transcriptEvents>, kind: string): (string | undefined)[] =>
  events
    .filter((e) => e.kind === kind)
    .map((e) => {
      const b = e.payload["branch"];
      return typeof b === "string" ? b : undefined;
    });
const byName = (a: string | undefined, b: string | undefined): number => (a ?? "").localeCompare(b ?? "");

describe("transcriptEvents branch", () => {
  it("stamps edits and commands with the line's branch", () => {
    const ev = transcriptEvents([assistant("09:00:00", { gitBranch: "feat/ftk-4-x" })]);
    expect(branchOf(ev, "file.edited")).toEqual(["feat/ftk-4-x"]);
    expect(branchOf(ev, "command.ran")).toEqual(["feat/ftk-4-x"]);
  });
  it("honours a branch change mid-session, per event (D54)", () => {
    const ev = transcriptEvents([
      assistant("09:00:00", { gitBranch: "feat/one" }),
      assistant("09:10:00", { gitBranch: "feat/two" }),
    ]);
    expect(branchOf(ev, "file.edited").toSorted(byName)).toEqual(["feat/one", "feat/two"]);
  });
  it("a line without gitBranch takes the nearest earlier line of the same session", () => {
    const ev = transcriptEvents([user("08:59:00", { gitBranch: "feat/one" }), assistant("09:00:00")]);
    expect(branchOf(ev, "file.edited")).toEqual(["feat/one"]);
  });
  it("no gitBranch anywhere: no branch key, so today's behaviour holds", () => {
    const ev = transcriptEvents([assistant("09:00:00")]);
    expect(ev.every((e) => !("branch" in e.payload))).toBe(true);
  });
  it("detached HEAD is no branch, and later lines without the field stay detached", () => {
    const ev = transcriptEvents([
      assistant("09:00:00", { gitBranch: "feat/one" }),
      user("09:05:00", { gitBranch: "HEAD" }),
      assistant("09:10:00"),
    ]);
    expect(branchOf(ev, "file.edited").toSorted(byName)).toEqual(["feat/one", undefined]);
    expect(branchOf(ev, "prompt.submitted")).toEqual([undefined]);
  });
  it("another session's branch does not leak across sessions", () => {
    const ev = transcriptEvents([
      assistant("09:00:00", { gitBranch: "feat/one" }),
      assistant("09:10:00", { sessionId: "s-2" }),
    ]);
    expect(ev.filter((e) => e.sessionId === "s-2").every((e) => !("branch" in e.payload))).toBe(true);
  });
});

const link = (extra: Record<string, unknown>) => {
  const ev = transcriptEvents([assistant("09:00:00", extra)]);
  return linkEvents(ev).links.filter((l) => ev.some((e) => e.sourceId === l.eventSourceId));
};

describe("linker with transcript branches", () => {
  it("a worktree branch such as claude/<name> anchors to its branch item", () => {
    const links = link({ gitBranch: "claude/calm-owl-1a2b3c" });
    expect(links).toHaveLength(2);
    for (const l of links)
      expect(l).toMatchObject({ itemKey: "branch::claude/calm-owl-1a2b3c", rule: "branch" });
  });
  it("an issue key in the branch name anchors to the key", () => {
    for (const l of link({ gitBranch: "feat/ftk-4-x" })) {
      expect(l).toMatchObject({ itemKey: "issue:FTK-4", rule: "issue-key-branch" });
    }
  });
  it("the default branch keeps today's provisional per-session item", () => {
    for (const l of link({ gitBranch: "main" })) {
      expect(l).toMatchObject({ itemKey: "session:s-1", rule: "provisional-session" });
    }
  });
  it("an unknown or detached branch keeps today's behaviour", () => {
    for (const extra of [{}, { gitBranch: "HEAD" }]) {
      for (const l of link(extra)) expect(l.itemKey).toBe("session:s-1");
    }
  });
});
