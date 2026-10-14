// `vantage stats`. Hermetic: a temp VANTAGE_HOME, a store built from synthetic events, never the real home.
// Synthetic data only. Every title, repo name, path and command below is made up and must never be printed.
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Store, runStagePass } from "@vantage/daemon";
import type { VantageEvent } from "@vantage/core";
import { computeStats, renderStats, runStats, type Stats } from "../src/stats.ts";

const NOW = new Date("2026-03-10T12:00:00Z");
const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();
const H = 3_600_000;
const D = 24 * H;

let home = "";
let seq = 0;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "vantage-stats-"));
});
afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

const dbPath = (): string => join(home, "vantage.db");
const sha = (): string => createHash("sha256").update(readFileSync(dbPath())).digest("hex");
const put = (
  store: Store,
  session: string,
  kind: VantageEvent["kind"],
  at: string,
  payload: Record<string, unknown>,
  source = "claude_code",
): void => {
  store.insertEvent({ sourceId: `e${++seq}`, source, kind, timestamp: at, sessionId: session, payload }, at);
};

/** Five items: two issue-anchored, one branch, two session fallbacks. See `fixture` expectations below. */
function fixture(): Store {
  const store = new Store(dbPath());
  const acme = { cwd: "/w/acme-secret/app" };
  // A: Built, claimed done with no check -> unproven_claim.
  put(store, "sess-aaaa", "file.edited", ago(5 * H), {
    ...acme,
    branch: "feat/ftk-1-secret-title",
    path: "/w/acme-secret/app/a.ts",
  });
  put(store, "sess-aaaa", "session.stopped", ago(4 * H), { ...acme, branch: "feat/ftk-1-secret-title" });
  // B: Proven three days ago by a passing runner.
  put(store, "sess-bbbb", "file.edited", ago(3 * D), {
    ...acme,
    branch: "feat/ftk-2-other",
    path: "/w/acme-secret/app/b.ts",
  });
  put(store, "sess-bbbb", "command.ran", ago(3 * D - 60_000), {
    ...acme,
    branch: "feat/ftk-2-other",
    command: "vitest run b.test.ts",
    ok: true,
  });
  // C: a branch item with no issue key, idle ten days -> forgotten.
  put(store, "sess-cccc", "file.edited", ago(10 * D), {
    cwd: "/w/beta-repo/x",
    branch: "wip/no-key-here",
    path: "/w/beta-repo/x/c.ts",
  });
  // D and E: edits on the default branch -> provisional session items with a fallback title.
  put(store, "sess-dddd1234", "file.edited", ago(2 * H), {
    cwd: "/w/beta-repo/x",
    branch: "main",
    path: "/w/beta-repo/x/d.ts",
  });
  put(store, "sess-eeee5678", "file.edited", ago(40 * D), {
    cwd: "/w/gamma/y",
    branch: "main",
    path: "/w/gamma/y/e.ts",
  });
  runStagePass(store, {}, NOW);
  return store;
}

const run = (args: string[]): { code: number; out: string[]; err: string[] } => {
  const out: string[] = [];
  const err: string[] = [];
  const code = runStats(
    args,
    { out: (l) => out.push(l), err: (l) => err.push(l), env: { VANTAGE_HOME: home } },
    NOW,
  );
  return { code, out, err };
};
const json = (args: string[] = []): Stats => {
  const r = run(["--json", ...args]);
  expect(r.err).toEqual([]);
  const parsed: Stats = JSON.parse(r.out.join("\n"));
  return parsed;
};

describe("vantage stats on a synthetic store", () => {
  it("counts items, activity windows, titles and anchors", () => {
    const store = fixture();
    const st = json();
    store.close();
    expect(st.items).toEqual({ total: 5, active24h: 2, active7d: 3, active30d: 4 });
    expect(st.titles).toMatchObject({ readable: 3, fallback: 2 });
    expect(st.titles.readableShare).toBeCloseTo(0.6);
    expect(st.anchors).toEqual({ issue: 2, branch: 1, worktree: 0, session: 2, other: 0 });
  });

  it("counts Needs you in total and over 48 h, with the top flag kinds", () => {
    const store = fixture();
    const st = json();
    store.close();
    expect(st.needsYou.total).toBe(3);
    expect(st.needsYou.recent48h).toBe(1);
    expect(st.needsYou.topFlags).toEqual([
      { kind: "forgotten", count: 2 },
      { kind: "unproven_claim", count: 1 },
    ]);
  });

  it("reports stages and Built items with no fresh proof", () => {
    const store = fixture();
    const st = json();
    store.close();
    expect(st.stages).toEqual({ asked: 0, built: 4, proven: 1, other: 0 });
    expect(st.builtNoFreshProof).toEqual({ count: 4, of: 4, share: 1 });
  });

  it("reports events by source and per day, and the stage pass age", () => {
    const store = fixture();
    put(store, "sess-ffff", "worktree.scanned", ago(H), { cwd: "/w/acme-secret/app" }, "git");
    const st = json();
    store.close();
    expect(st.events.total).toBe(8);
    expect(st.events.bySource).toEqual([
      { source: "claude_code", count: 7 },
      { source: "git", count: 1 },
    ]);
    expect(st.stagePass.ageSeconds).toBe(0);
    expect(st.days).toHaveLength(14);
    expect(st.days.at(-1)?.day).toBe("2026-03-10");
    // Today: A (2 events), D (1) and the git scan; B's events are three days ago.
    expect(st.days.at(-1)?.events).toBe(4);
    expect(st.days.at(-4)?.events).toBe(2);
    expect(st.days.at(-4)?.reachedProven).toBe(1);
    expect(st.days.at(-4)?.titled).toBe(1);
    expect(st.db.sizeBytes).toBeGreaterThan(0);
  });

  it("shows derived sessions only when lineage data exists", () => {
    const store = fixture();
    expect(json().sessions).toMatchObject({ total: 5, derived: null, derivedShare: null });
    expect(run([]).out.join("\n")).not.toContain("Sessions derived");
    put(store, "sess-dddd1234", "session.derived", ago(2 * H), { parentSessionId: "sess-aaaa" });
    const st = json();
    store.close();
    expect(st.sessions).toMatchObject({ total: 5, derived: 1, derivedShare: 0.2 });
    expect(run([]).out.join("\n")).toContain("Sessions derived");
  });

  it("reports lineage: sessions per item, multi-session items, sub-agent runs and anchored share", () => {
    const store = fixture();
    const before = json().sessions;
    expect(before).toMatchObject({
      total: 5,
      anchored: 3,
      provisional: 2,
      perItemMedian: 1,
      perItemMax: 1,
      multiSessionItems: 0,
      subagentRuns: null,
    });
    expect(before.anchoredShare).toBeCloseTo(0.6);
    expect(run([]).out.join("\n")).not.toContain("Sub-agent runs");
    // A second session, with a sub-agent run, lands on the first issue item.
    put(store, "sess-a2", "file.edited", ago(H), {
      cwd: "/w/acme-secret/app",
      branch: "feat/ftk-1-secret-title",
      path: "/w/acme-secret/app/a.ts",
      agentId: "agent-1",
    });
    runStagePass(store, {}, NOW);
    const st = json();
    const text = run([]).out.join("\n");
    store.close();
    expect(st.sessions).toMatchObject({
      total: 6,
      anchored: 4,
      provisional: 2,
      perItemMedian: 1,
      perItemMax: 2,
      multiSessionItems: 1,
      subagentRuns: 1,
    });
    expect(st.sessions.anchoredShare).toBeCloseTo(4 / 6);
    expect(text).toMatch(/Sessions anchored\s+67%/);
    expect(text).toMatch(/Sessions per item\s+1 \/ 2/);
    expect(text).toMatch(/Sub-agent runs\s+1/);
  });

  it("limits to a window with --since", () => {
    const store = fixture();
    const st = json(["--since", "7d"]);
    store.close();
    expect(st.items.total).toBe(3);
    expect(st.events.total).toBe(5);
    expect(json(["--since", "2026-03-09"]).items.total).toBe(2);
  });

  it("limits to a repo by name, case-insensitively, and echoes only what was typed", () => {
    const store = fixture();
    const st = json(["--repo", "ACME-secret"]);
    const text = run(["--repo", "ACME-secret"]).out.join("\n");
    store.close();
    expect(st.items.total).toBe(2);
    expect(st.events.total).toBe(4);
    expect(st.repoFilter).toBe("ACME-secret");
    expect(text).toContain("repo filter: ACME-secret");
    expect(json(["--repo", "nothing-here"]).items.total).toBe(0);
  });

  it("prints a per-day trend with --days", () => {
    const store = fixture();
    const r = run(["--days", "7"]);
    store.close();
    const rows = r.out.filter((l) => /^2026-03-\d\d /.test(l));
    expect(rows).toHaveLength(7);
    expect(rows.at(-1)?.startsWith("2026-03-10")).toBe(true);
    expect(r.out.join("\n")).not.toContain("Needs you, total");
  });

  it("marks each goal with a symbol and says goals are starting points", () => {
    const store = fixture();
    const text = run([]).out.join("\n");
    store.close();
    expect(text).toMatch(/✅ Needs you, total\s+3/);
    expect(text).toMatch(/❌ Built, no fresh proof\s+100%/);
    expect(text).toMatch(/⚠️ Readable titles\s+60%/);
    expect(text).toContain("starting points");
  });

  it("prints only numbers and fixed labels: no title, command, path, repo, session or key text", () => {
    const store = fixture();
    const all = [...run([]).out, ...run(["--days", "5"]).out, ...run(["--json"]).out].join("\n");
    store.close();
    for (const leak of [
      "secret",
      "acme",
      "beta-repo",
      "gamma",
      "no-key",
      "ftk",
      "FTK",
      "vitest",
      "sess-",
      "agent-1",
      "dddd",
      "/w/",
      "a.ts",
      "feat/",
      "wip/",
      "main",
      home,
    ]) {
      expect(all, `output leaked "${leak}"`).not.toContain(leak);
    }
  });

  it("never writes: the database file is byte-identical, also while a writer holds it open", () => {
    const store = fixture();
    store.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    const before = sha();
    expect(run([]).code).toBe(0);
    expect(run(["--json", "--repo", "acme-secret"]).code).toBe(0);
    expect(sha()).toBe(before);
    store.close();
    expect(run([]).code).toBe(0);
  });
});

describe("vantage stats edge cases", () => {
  it("handles an empty store", () => {
    new Store(dbPath()).close();
    const st = json();
    expect(st.items).toEqual({ total: 0, active24h: 0, active7d: 0, active30d: 0 });
    expect(st.titles.readableShare).toBeNull();
    expect(st.builtNoFreshProof.share).toBeNull();
    expect(st.stagePass).toEqual({ lastAt: null, ageSeconds: null });
    expect(st.days.every((d) => d.events === 0 && d.active === 0)).toBe(true);
    const text = run([]).out.join("\n");
    expect(text).toContain("n/a");
    expect(text).toContain("never");
  });

  it("says what to do when there is no database, and writes nothing", () => {
    const r = run([]);
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("vantage start");
    expect(existsSync(dbPath())).toBe(false);
  });

  it("rejects bad arguments", () => {
    expect(run(["--since", "soon"]).code).toBe(2);
    expect(run(["--days", "0"]).code).toBe(2);
    expect(run(["--days", "400"]).code).toBe(2);
    expect(run(["--repo"]).code).toBe(2);
    expect(run(["--bogus"]).code).toBe(2);
  });

  it("answers over tens of thousands of items quickly and prints them exactly", () => {
    const store = new Store(dbPath());
    const at = ago(H);
    store.transaction(() => {
      const ins = store.db.prepare(
        `INSERT INTO work_items (item_key, title, stage, proof_status, first_activity, last_activity, created_at, updated_at)
         VALUES (?, ?, 'built', 'none', ?, ?, ?, ?)`,
      );
      const flag = store.db.prepare(
        "INSERT INTO flags (work_item_id, kind, severity, raised_at, reason) VALUES (?, 'forgotten', 'amber', ?, 'r')",
      );
      for (let i = 1; i <= 50_000; i++) {
        ins.run(`session:s${i}`, `Session s${i}`, at, at, at, at);
        flag.run(i, at);
      }
    });
    store.close();
    const t0 = Date.now();
    const st = json();
    expect(Date.now() - t0).toBeLessThan(10_000);
    expect(st.items.total).toBe(50_000);
    expect(st.needsYou).toMatchObject({ total: 50_000, recent48h: 50_000 });
    expect(st.titles.readableShare).toBe(0);
    expect(run([]).out.join("\n")).toContain("50000");
  });

  it("renders huge numbers without breaking the layout", () => {
    const store = fixture();
    const st = computeStats(store.db, { since: null, repo: null, days: 3 }, NOW, 5 * 1024 ** 4);
    store.close();
    st.items.total = 10 ** 12;
    st.events.total = 2 ** 40;
    const text = renderStats(st, false).join("\n");
    expect(text).toContain("1000000000000");
    expect(text).toContain("5242880.0 MB");
  });
});
