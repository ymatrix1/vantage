import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVENT_KINDS, isEventKind, parseEvent } from "../src/index.ts";

const fixture = readFileSync(new URL("./fixtures/session-basic.jsonl", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean);

describe("event catalog", () => {
  it("has 39 unique kinds across six groups", () => {
    const all = Object.values(EVENT_KINDS).flat();
    expect(Object.keys(EVENT_KINDS)).toHaveLength(6);
    expect(all).toHaveLength(39);
    expect(new Set(all).size).toBe(all.length);
  });

  it("rejects unknown kinds", () => {
    expect(isEventKind("command.ran")).toBe(true);
    expect(isEventKind("session.flew")).toBe(false);
  });
});

describe("parseEvent", () => {
  it("keeps valid events from a replayed fixture and drops the rest", () => {
    const events = fixture.map(parseEvent).filter((e) => e !== null);
    expect(events.map((e) => e.kind)).toEqual(["session.started", "file.edited", "command.ran"]);
    expect(events[2]?.payload).toEqual({ command: "pnpm test", exitCode: 0 });
    expect(events[0]?.sessionId).toBe("s-0001");
  });

  it("rejects a bad timestamp", () => {
    const line = JSON.stringify({
      sourceId: "x",
      source: "git",
      kind: "commit.created",
      timestamp: "soon",
      payload: {},
    });
    expect(parseEvent(line)).toBeNull();
  });
});
