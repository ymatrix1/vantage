// Pure helpers for session names, the Asked line and the resume command (D191 to D193).
import { describe, expect, it } from "vitest";
import { resumeCommand } from "../src/lib/links";
import { absoluteTime, askedLine, sessionLabel } from "../src/lib/proof-line";

const NOW = new Date("2026-01-05T12:00:00");
const ID = "981b84ab-1111-4222-8333-444455556666";

describe("sessionLabel", () => {
  it("prefers the name and falls back to a short id", () => {
    expect(sessionLabel("Fix login", ID)).toBe("Fix login");
    expect(sessionLabel(null, ID)).toBe("Session 981b84ab");
    expect(sessionLabel("", ID)).toBe("Session 981b84ab");
  });
});

describe("askedLine", () => {
  const at = "2026-01-05T11:39:00";
  it("shows name, anchor type and value, then the absolute and relative time", () => {
    const line = askedLine(
      { at, anchorKind: "branch", anchorValue: "claude/x", sessionId: ID, sessionName: "Fix login" },
      NOW,
    );
    expect(line).toBe("Fix login · branch claude/x · Jan 5, 11:39 (21 min ago)");
  });
  it("covers issue, worktree and no session, never printing 'anchored on'", () => {
    expect(askedLine({ at, anchorKind: "issue_key", anchorValue: "FTK-1", sessionId: ID }, NOW)).toContain(
      "Session 981b84ab · issue FTK-1 · ",
    );
    const none = askedLine({ at, anchorKind: "worktree", anchorValue: "brave-x", sessionId: null }, NOW);
    expect(none).toContain("No session recorded · worktree brave-x · ");
    expect(none).not.toContain("anchored on");
  });
  it("shows the year only when it is not this year", () => {
    expect(absoluteTime("2025-12-31T23:05:00", NOW)).toBe("Dec 31 2025, 23:05");
    expect(absoluteTime("nope", NOW)).toBe("time unknown");
  });
});

describe("resumeCommand", () => {
  it("is cd plus claude --resume with the full session id", () => {
    expect(resumeCommand(ID, "/home/u/demo")).toBe(`cd "/home/u/demo" && claude --resume ${ID}`);
  });
  it("leaves out an unsafe folder and refuses a malformed id", () => {
    expect(resumeCommand(ID, 'C:/x/"; rm -rf')).toBe(`claude --resume ${ID}`);
    expect(resumeCommand(ID, null)).toBe(`claude --resume ${ID}`);
    expect(resumeCommand("abc; rm -rf /", "/x")).toBeNull();
    expect(resumeCommand(null, "/x")).toBeNull();
  });
});
