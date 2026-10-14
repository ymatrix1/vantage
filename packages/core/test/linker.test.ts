// Replays synthetic events (test/fixtures/linker-events.jsonl) through the linker.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractIssueKeys, linkEvents, parseEvent, undoKey, type VantageEvent } from "../src/index.ts";

const events = readFileSync(fileURLToPath(new URL("./fixtures/linker-events.jsonl", import.meta.url)), "utf8")
  .split("\n")
  .map(parseEvent)
  .filter((e): e is VantageEvent => e !== null);

const result = linkEvents(events, { repo: "demo" });
const linkOf = (id: string) => result.links.find((l) => l.eventSourceId === id);

describe("extractIssueKeys", () => {
  it("reads Jira and Linear style keys, case-insensitively, in order", () => {
    expect(extractIssueKeys("user/eng-123-title")).toEqual(["ENG-123"]);
    expect(extractIssueKeys("FTK-7 and ftk-8, FTK-7 again")).toEqual(["FTK-7", "FTK-8"]);
  });
  it("ignores encodings and respects a project allow-list", () => {
    expect(extractIssueKeys("fix/utf-8-bug sha-256")).toEqual([]);
    expect(extractIssueKeys("ABC-1 FTK-2", ["ftk"])).toEqual(["FTK-2"]);
  });
});

describe("linkEvents replay", () => {
  it("links by issue key found in the branch, resolved from the worktree path", () => {
    expect(linkOf("a1")).toMatchObject({
      itemKey: "issue:FTK-101",
      rule: "issue-key-branch",
      method: "anchor",
    });
  });
  it("links each event by its own branch (D54): a switch splits the session", () => {
    expect(linkOf("a2")).toMatchObject({ itemKey: "branch:demo:feat/new-thing", rule: "branch" });
    expect(linkOf("a3")?.itemKey).toBe("branch:demo:feat/new-thing");
    expect(linkOf("a1")?.itemKey).toBe("issue:FTK-101");
  });
  it("sends an event to the key it names among several on the branch, else the first", () => {
    expect(linkOf("d2")).toMatchObject({ itemKey: "issue:FTK-8", rule: "issue-key-text" });
    expect(linkOf("d1")).toMatchObject({ itemKey: "issue:FTK-7", rule: "issue-key-branch" });
  });
  it("anchors a detached linked worktree on the worktree", () => {
    expect(linkOf("e1")).toMatchObject({ itemKey: "worktree:/work/wt-c", rule: "worktree" });
  });
  it("makes a provisional item per session with edits on the default branch", () => {
    expect(linkOf("b1")).toMatchObject({ itemKey: "session:s2", rule: "provisional-session" });
    expect(linkOf("b2")?.itemKey).toBe("session:s2");
  });
  it("leaves default-branch sessions without edits, and events with no context, unlinked", () => {
    expect(linkOf("c1")).toBeUndefined();
    expect(linkOf("h1")).toBeUndefined();
    expect(result.unlinked.filter((u) => u.reason === "no-anchor").map((u) => u.eventSourceId)).toEqual(
      expect.arrayContaining(["c1", "h1"]),
    );
  });
  it("does not read an encoding in a branch name as an issue key", () => {
    expect(linkOf("f1")).toMatchObject({ itemKey: "branch:demo:fix/utf-8-bug", rule: "branch" });
  });
  it("accounts for every event exactly once", () => {
    expect(result.links.length + result.unlinked.length).toBe(events.length);
  });
  it("is deterministic and independent of input order", () => {
    expect(linkEvents(events.toReversed(), { repo: "demo" }).links.toSorted(byId)).toEqual(
      result.links.toSorted(byId),
    );
  });
});

describe("undo and options", () => {
  it("never re-creates a link the user undid", () => {
    const undone = new Set([undoKey("claude_code", "a1", "issue:FTK-101")]);
    const r = linkEvents(events, { repo: "demo", undone });
    expect(r.links.find((l) => l.eventSourceId === "a1")).toBeUndefined();
    expect(r.unlinked).toContainEqual({ eventSource: "claude_code", eventSourceId: "a1", reason: "undone" });
  });
  it("treats configured default branches as default", () => {
    const r = linkEvents(events, { repo: "demo", defaultBranches: ["feat/new-thing"] });
    expect(r.links.find((l) => l.eventSourceId === "a3")?.rule).toBe("provisional-session");
  });
});

function byId(a: { eventSourceId: string }, b: { eventSourceId: string }): number {
  return a.eventSourceId.localeCompare(b.eventSourceId);
}
