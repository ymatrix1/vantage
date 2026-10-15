import { afterEach, describe, expect, it } from "vitest";
import Trace from "../src/lib/Trace.svelte";
import { cleanup, render, traceOf } from "./helpers";

afterEach(cleanup);

describe("trace view (D45)", () => {
  it("renders stage history, proofs and linked events with their rule", () => {
    const root = render(Trace, { trace: traceOf("a") });
    const text = root.textContent ?? "";
    expect(text).toContain("start → asked: first prompt");
    expect(text).toContain("Test");
    expect(text).toContain("Passed · L2");
    expect(text).toContain("pnpm test");
    expect(text).toContain("session a1b2c3d4, anchored on branch feat/x");
    expect(text).toContain("commit from git, linked by branch-name");
  });

  it("shows weak-proof reasons and undone events", () => {
    const trace = traceOf("a", {
      proofs: [
        {
          eventId: 3,
          level: 1,
          state: "weak",
          weakReason: "ran before last edit",
          command: "x",
          ranAt: "",
          type: "test",
          stale: false,
        },
      ],
      events: [{ eventId: 4, source: "agent", kind: "stop", occurredAt: "", rule: null, undone: true }],
    });
    const text = render(Trace, { trace }).textContent ?? "";
    expect(text).toContain("Weak, ran before last edit · L1");
    expect(text).toContain("linked by unknown rule (undone)");
  });

  it("says so when a section is empty", () => {
    const trace = traceOf("a", { events: [], transitions: [], proofs: [], asked: null });
    const text = render(Trace, { trace }).textContent ?? "";
    expect(text).toContain("No stage change yet.");
    expect(text).toContain("No proof recorded.");
    expect(text).toContain("No events linked.");
    expect(text).toContain("No record of what started it.");
  });

  it("draws each proof as one line with a result icon, age and edited-since (D131)", () => {
    const base = { eventId: 5, level: 1, weakReason: null, command: "pnpm test", ranAt: "", type: "test" };
    const trace = traceOf("a", {
      proofs: [
        { ...base, eventId: 5, state: "fresh", stale: false },
        { ...base, eventId: 6, state: "expired", stale: true },
        { ...base, eventId: 7, state: "failed", stale: false, type: "data_check" },
      ],
    });
    const root = render(Trace, { trace });
    const items = [...root.querySelectorAll("section")[2].querySelectorAll("li")];
    expect(items.map((li) => li.querySelector("[role=img]")?.getAttribute("aria-label"))).toEqual([
      "Passed",
      "Stale",
      "Failed",
    ]);
    expect(items[1].textContent).toContain("edited since");
    expect(items[0].textContent).not.toContain("edited since");
    expect(items[2].textContent).toContain("Data check");
    expect(root.innerHTML).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
