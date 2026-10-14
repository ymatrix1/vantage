import { afterEach, describe, expect, it } from "vitest";
import Trace from "../src/lib/Trace.svelte";
import { cleanup, render, traceOf } from "./helpers";

afterEach(cleanup);

describe("trace view (D45)", () => {
  it("renders stage history, proofs and linked events with their rule", () => {
    const root = render(Trace, { trace: traceOf("a") });
    const text = root.textContent ?? "";
    expect(text).toContain("start → asked: first prompt");
    expect(text).toContain("L2 fresh: pnpm test");
    expect(text).toContain("commit from git, linked by branch-name");
  });

  it("shows weak-proof reasons and undone events", () => {
    const trace = traceOf("a", {
      proofs: [
        { eventId: 3, level: 1, state: "weak", weakReason: "ran before last edit", command: "x", ranAt: "" },
      ],
      events: [{ eventId: 4, source: "agent", kind: "stop", occurredAt: "", rule: null, undone: true }],
    });
    const text = render(Trace, { trace }).textContent ?? "";
    expect(text).toContain("L1 weak (ran before last edit)");
    expect(text).toContain("linked by unknown rule (undone)");
  });

  it("says so when a section is empty", () => {
    const trace = traceOf("a", { events: [], transitions: [], proofs: [] });
    const text = render(Trace, { trace }).textContent ?? "";
    expect(text).toContain("No stage change yet.");
    expect(text).toContain("No proof recorded.");
    expect(text).toContain("No events linked.");
  });
});
