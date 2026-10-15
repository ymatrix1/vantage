// Synthetic transcript lines only.
import { describe, expect, it } from "vitest";
import { cleanSessionName, latestSessionName, sessionNameOfLine } from "../src/index.ts";

const SID = "11111111-2222-3333-4444-555555555555";
const custom = (name: string, sessionId = SID): string =>
  JSON.stringify({ type: "custom-title", customTitle: name, sessionId });
const agent = (name: string, sessionId = SID): string =>
  JSON.stringify({ type: "agent-name", agentName: name, sessionId });

describe("session names (D191)", () => {
  it("reads a custom title and a generated name, and ignores every other line", () => {
    expect(sessionNameOfLine(custom("Fix login redirect"), SID)).toEqual({
      source: "custom",
      name: "Fix login redirect",
    });
    expect(sessionNameOfLine(agent("Plan the migration"), SID)).toEqual({
      source: "agent",
      name: "Plan the migration",
    });
    expect(
      sessionNameOfLine(JSON.stringify({ type: "user", message: { content: "custom-title" } }), SID),
    ).toBeNull();
    expect(sessionNameOfLine("not json custom-title", SID)).toBeNull();
  });

  it("ignores another session's name", () => {
    expect(sessionNameOfLine(custom("Other", "99999999-0000-0000-0000-000000000000"), SID)).toBeNull();
  });

  it("keeps the latest of a kind, and a custom name over a later generated one", () => {
    expect(latestSessionName([agent("A"), agent("B")], SID)?.name).toBe("B");
    expect(latestSessionName([custom("Mine"), agent("Generated later")], SID)).toEqual({
      source: "custom",
      name: "Mine",
    });
    expect(latestSessionName([custom("One"), custom("Two")], SID)?.name).toBe("Two");
    expect(latestSessionName([], SID)).toBeNull();
  });

  it("cleans a name to one short line", () => {
    expect(cleanSessionName("  a\n\tb   c ")).toBe("a b c");
    expect(cleanSessionName("   ")).toBeNull();
    const long = cleanSessionName("x".repeat(200)) ?? "";
    expect(long.length).toBe(80);
    expect(long.endsWith("…")).toBe(true);
  });
});
