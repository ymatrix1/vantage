// Synthetic events only: no real transcripts or paths (docs/../privacy-boundary.md).
import { describe, expect, it } from "vitest";
import { computeStages, linkEvents } from "../src/index.ts";
import type { ItemState, VantageEvent } from "../src/index.ts";

let n = 0;
const at = (m: number): string => new Date(Date.UTC(2026, 0, 5, 9, m)).toISOString();
const BRANCH = "feat/ftk-1-demo";
const ev = (kind: VantageEvent["kind"], m: number, payload: Record<string, unknown> = {}): VantageEvent => ({
  sourceId: `e${++n}`,
  source: "claude_code",
  kind,
  timestamp: at(m),
  sessionId: "s1",
  payload: { branch: BRANCH, ...payload },
});
const edit = (m: number, path = "/w/src/a.ts", extra = {}): VantageEvent =>
  ev("file.edited", m, { path, via: "edit-tool", ...extra });
const cmd = (m: number, command: string, ok = true, extra = {}): VantageEvent =>
  ev("command.ran", m, { command, ok, ...extra });

/** Links with the real linker, so tests cover linker plus stage machine together. */
function run(events: VantageEvent[], opts = {}): ItemState[] {
  return computeStages(events, linkEvents(events).links, opts);
}
const one = (events: VantageEvent[], opts = {}): ItemState => {
  const [item] = run(events, opts);
  if (!item) throw new Error("no item");
  return item;
};

describe("stage gates", () => {
  it("Asked: an anchored item with no edits", () => {
    const s = one([ev("prompt.submitted", 0)]);
    expect(s.stage).toBe("asked");
    expect(s.itemKey).toBe("issue:FTK-1");
  });

  it("Built on the first code edit, not before", () => {
    const s = one([ev("prompt.submitted", 0), edit(1)]);
    expect(s.stage).toBe("built");
    expect(s.transitions.map((t) => t.to)).toEqual(["asked", "built"]);
  });

  it("Built on a commit with no hook edits (edits made outside the agent)", () => {
    expect(one([ev("commit.created", 1, { subject: "x" })]).stage).toBe("built");
  });

  it("a commit made through the shell is not an edit", () => {
    expect(one([ev("prompt.submitted", 0), edit(1, "x", { via: "shell-commit" })]).stage).toBe("asked");
  });

  it("Proven when a passing test runs after the last edit", () => {
    const s = one([edit(1), cmd(2, "pnpm vitest run")]);
    expect(s.stage).toBe("proven");
    expect(s.proofStatus).toBe("fresh");
    expect(s.proofLevel).toBe(1);
    expect(s.proofs[0]).toMatchObject({ type: "test", state: "fresh", level: 1 });
  });

  it("an agent saying it is done moves nothing", () => {
    const s = one([edit(1), ev("session.stopped", 2)]);
    expect(s.stage).toBe("built");
  });

  it("a data check proves data work", () => {
    const s = one([edit(1, "/w/models/a.sql"), cmd(2, "duckdb db.duckdb -c 'select 1'")]);
    expect(s.proofs[0]?.type).toBe("data_check");
    expect(s.stage).toBe("proven");
  });
});

describe("proof expiry", () => {
  it("a later code edit expires the proof and the card drops to Built", () => {
    const s = one([edit(1), cmd(2, "pnpm test"), edit(3)]);
    expect(s.stage).toBe("built");
    expect(s.proofStatus).toBe("expired");
    expect(s.proofs[0]?.state).toBe("expired");
    expect(s.proofs[0]?.expiredBy).toMatchObject({ sourceId: expect.any(String) });
    expect(s.transitions.map((t) => t.to)).toEqual(["asked", "built", "proven", "built"]);
  });

  it("a new passing check after the edit makes it Proven again", () => {
    const s = one([edit(1), cmd(2, "pnpm test"), edit(3), cmd(4, "pnpm test")]);
    expect(s.stage).toBe("proven");
    expect(s.proofs.map((p) => p.state)).toEqual(["expired", "fresh"]);
  });

  it("a documentation edit after proof does not expire it", () => {
    const s = one([edit(1), cmd(2, "pnpm test"), edit(3, "/w/README.md")]);
    expect(s.stage).toBe("proven");
  });

  it("an edit that names no path (sed -i) expires proof", () => {
    const s = one([edit(1), cmd(2, "pnpm test"), edit(3, undefined, { via: "shell", path: undefined })]);
    expect(s.stage).toBe("built");
  });

  it("the fingerprint changes when code edits change", () => {
    const s = one([edit(1), cmd(2, "pnpm test"), edit(3), cmd(4, "pnpm test")]);
    expect(s.proofs[0]?.fingerprint).not.toBe(s.proofs[1]?.fingerprint);
  });

  it("a commit after proof does not expire it", () => {
    const s = one([edit(1), cmd(2, "pnpm test"), ev("commit.created", 3, { subject: "x" })]);
    expect(s.stage).toBe("proven");
  });
});

describe("proof levels", () => {
  it("L2 when the command names an edited file", () => {
    const s = one([edit(1, "/w/src/billing.ts"), cmd(2, "pnpm vitest run test/billing.test.ts")]);
    expect(s.proofLevel).toBe(2);
  });
  it("L1 when the runner is filtered to something else", () => {
    const s = one([edit(1, "/w/src/billing.ts"), cmd(2, "pnpm vitest run test/other.test.ts")]);
    expect(s.proofLevel).toBe(1);
  });
});

const weak = (command: string, extra = {}): ItemState => one([edit(1), cmd(2, command, true, extra)]);

describe("fake and weak proof (proof spec)", () => {
  it.each([
    ["pnpm test || true", "cannot-fail"],
    ["pnpm test; exit 0", "cannot-fail"],
    ["vitest run --passWithNoTests", "no-tests-allowed"],
  ])("%s never proves", (command, reason) => {
    const s = weak(command);
    expect(s.stage).toBe("built");
    expect(s.proofs[0]).toMatchObject({ state: "weak", weak: reason });
    expect(s.proofStatus).toBe("weak");
  });

  it("0 tests run never proves", () => {
    const s = weak("pnpm test", { result: { run: 0 } });
    expect(s.proofs[0]).toMatchObject({ state: "weak", weak: "zero-tests" });
    expect(s.stage).toBe("built");
  });

  it("all tests skipped never proves", () => {
    expect(weak("pytest", { result: { run: 4, skipped: 4 } }).stage).toBe("built");
  });

  it("commands that cannot fail are not checks at all", () => {
    for (const c of ["echo ok", "true", "exit 0", "ls", "git status"]) {
      expect(weak(c).proofs).toEqual([]);
    }
  });

  it("a check that ran before any code change proves nothing", () => {
    const s = one([ev("prompt.submitted", 0), cmd(1, "pnpm test"), edit(2)]);
    expect(s.proofs[0]).toMatchObject({ state: "weak", weak: "before-build" });
    expect(s.stage).toBe("built");
  });

  it("a check with an unknown outcome is not evidence", () => {
    const s = one([edit(1), ev("command.ran", 2, { command: "pnpm test" })]);
    expect(s.proofs).toEqual([]);
    expect(s.stage).toBe("built");
  });

  it("a failing check is recorded, not counted", () => {
    const s = one([edit(1), cmd(2, "pnpm test", false)]);
    expect(s.proofs[0]?.state).toBe("failed");
    expect(s.proofStatus).toBe("failed");
    expect(s.stage).toBe("built");
  });

  it("a compound command counts when one segment is a real check", () => {
    expect(one([edit(1), cmd(2, "cd /w && pnpm test")]).stage).toBe("proven");
  });
});

describe("docs-only sessions (D53)", () => {
  it("need no proof and raise no unproven_claim", () => {
    const s = one([edit(1, "/w/docs/a.md"), edit(2, "/w/README.md"), ev("session.stopped", 3)]);
    expect(s.docsOnly).toBe(true);
    expect(s.proofStatus).toBe("not_required");
    expect(s.stage).toBe("built");
    expect(s.flags).toEqual([]);
  });

  it("a code edit alongside docs needs proof", () => {
    const s = one([edit(1, "/w/docs/a.md"), edit(2), ev("session.stopped", 3)]);
    expect(s.docsOnly).toBe(false);
    expect(s.flags.map((f) => f.kind)).toEqual(["unproven_claim"]);
  });
});

describe("flags", () => {
  it("unproven_claim: stopped with code edits and no fresh proof", () => {
    const s = one([edit(1), ev("session.stopped", 2)]);
    expect(s.flags[0]).toMatchObject({ kind: "unproven_claim", severity: "amber" });
  });

  it("no unproven_claim when proof is fresh at stop", () => {
    expect(one([edit(1), cmd(2, "pnpm test"), ev("session.stopped", 3)]).flags).toEqual([]);
  });

  it("no unproven_claim when proof expired before stop", () => {
    const s = one([edit(1), cmd(2, "pnpm test"), edit(3), ev("session.stopped", 4)]);
    expect(s.flags.map((f) => f.kind)).toEqual(["unproven_claim"]);
  });

  it("forgotten: Built and idle past N days; never once Proven", () => {
    const now = new Date(Date.UTC(2026, 0, 12));
    expect(one([edit(1)], { now }).flags.map((f) => f.kind)).toEqual(["forgotten"]);
    expect(one([edit(1)], { now: new Date(Date.UTC(2026, 0, 7)) }).flags).toEqual([]);
    expect(one([edit(1), cmd(2, "pnpm test")], { now }).flags).toEqual([]);
  });
});

const cycle = (m: number, ok = false): VantageEvent[] => [edit(m), cmd(m + 1, "pnpm build", ok)];

describe("thrashing (D55)", () => {
  it("3 edit and failing-command cycles on one file raise it", () => {
    const s = one([...cycle(1), ...cycle(3), ...cycle(5)]);
    expect(s.flags.map((f) => f.kind)).toEqual(["thrashing"]);
  });

  it("2 cycles do not", () => {
    expect(one([...cycle(1), ...cycle(3)]).flags).toEqual([]);
  });

  it("harmless successful commands between failures do not reset the count", () => {
    const s = one([...cycle(1), cmd(2, "ls"), ...cycle(3), cmd(4, "git status"), ...cycle(5)]);
    expect(s.flags.map((f) => f.kind)).toEqual(["thrashing"]);
  });

  it("a passing qualifying check resets it", () => {
    const s = one([...cycle(1), ...cycle(3), cmd(5, "pnpm test"), ...cycle(6)]);
    expect(s.flags).toEqual([]);
  });

  it("cycles on different files do not add up", () => {
    const s = one([
      edit(1, "/w/a.ts"),
      cmd(2, "pnpm build", false),
      edit(3, "/w/b.ts"),
      cmd(4, "pnpm build", false),
      edit(5, "/w/c.ts"),
      cmd(6, "pnpm build", false),
    ]);
    expect(s.flags).toEqual([]);
  });

  it("clears again after a later passing check", () => {
    const s = one([...cycle(1), ...cycle(3), ...cycle(5), edit(7), cmd(8, "pnpm test")]);
    expect(s.flags).toEqual([]);
  });
});

describe("linking edge cases", () => {
  it("unlinked events feed no item", () => {
    const e = { ...edit(1), payload: { path: "/w/a.ts", branch: "main" }, sessionId: undefined };
    const { sessionId: _s, ...noSession } = e;
    const events: VantageEvent[] = [noSession];
    expect(computeStages(events, linkEvents(events).links)).toEqual([]);
  });

  it("an undone link removes the event from the item", () => {
    const events = [edit(1), cmd(2, "pnpm test")];
    const links = linkEvents(events).links.filter((l) => l.eventSourceId !== events[1]?.sourceId);
    expect(computeStages(events, links)[0]?.stage).toBe("built");
  });

  it("ambiguous branch with two keys: a check goes only to the key it names", () => {
    const b = "feat/FTK-7-and-FTK-8";
    const mk = (kind: VantageEvent["kind"], m: number, p: Record<string, unknown>): VantageEvent => ({
      ...ev(kind, m, p),
      payload: { branch: b, ...p },
    });
    const events = [
      mk("file.edited", 1, { path: "/w/a.ts" }),
      mk("command.ran", 2, { command: "pnpm test # FTK-8", ok: true }),
    ];
    const items = computeStages(events, linkEvents(events).links);
    const byKey = Object.fromEntries(items.map((i) => [i.itemKey, i.stage]));
    expect(byKey).toEqual({ "issue:FTK-7": "built", "issue:FTK-8": "asked" });
  });

  it("replay is deterministic and order independent", () => {
    const events = [edit(1), cmd(2, "pnpm test"), edit(3)];
    const a = run(events);
    const b = run(events.toReversed());
    expect(b).toEqual(a);
  });

  it("every transition names the event that caused it (D45)", () => {
    const s = one([edit(1), cmd(2, "pnpm test"), edit(3)]);
    for (const t of s.transitions) expect(t.evidence.sourceId).toMatch(/^e\d+$/);
    expect(s.transitions.at(-1)?.reason).toContain("expired");
  });
});
