// Inputs are synthetic strings in git's documented porcelain formats.
import { describe, expect, it } from "vitest";
import {
  diffScan,
  normalizeRemoteUrl,
  parseLog,
  parseStatus,
  parseWorktreeList,
  repoKey,
  scanIntervalMs,
  type GitCommit,
  type ScanInput,
} from "../src/index.ts";

describe("parseWorktreeList", () => {
  it("reads main, linked, detached and bare entries", () => {
    const out =
      "worktree /r\0HEAD aaa\0branch refs/heads/main\0\0" +
      "worktree /r-wt\0HEAD bbb\0branch refs/heads/feat/x\0\0" +
      "worktree /r-det\0HEAD ccc\0detached\0\0" +
      "worktree /r.git\0bare\0\0";
    expect(parseWorktreeList(out)).toEqual([
      { path: "/r", head: "aaa", branch: "main", bare: false },
      { path: "/r-wt", head: "bbb", branch: "feat/x", bare: false },
      { path: "/r-det", head: "ccc", branch: null, bare: false },
      { path: "/r.git", head: null, branch: null, bare: true },
    ]);
  });
});

describe("parseStatus", () => {
  it("reads branch, head and dirty files including renames, spaces and untracked", () => {
    const h = "a".repeat(40);
    const out =
      `# branch.oid ${h}\0# branch.head main\0` +
      `1 .M N... 100644 100644 100644 ${h} ${h} src/a b.ts\0` +
      `2 R. N... 100644 100644 100644 ${h} ${h} R100 new.ts\0old.ts\0` +
      "? notes.txt\0";
    expect(parseStatus(out)).toEqual({
      head: h,
      branch: "main",
      dirty: [
        { path: "src/a b.ts", status: ".M" },
        { path: "new.ts", status: "R." },
        { path: "notes.txt", status: "??" },
      ],
    });
  });

  it("handles a fresh repo and a detached head", () => {
    expect(parseStatus("# branch.oid (initial)\0# branch.head main\0")).toEqual({
      head: null,
      branch: "main",
      dirty: [],
    });
    expect(parseStatus("# branch.oid abc\0# branch.head (detached)\0").branch).toBeNull();
  });
});

describe("parseLog", () => {
  it("parses records and skips malformed ones", () => {
    const out =
      "a1\x1fp1 p2\x1f2026-01-05T09:00:00+00:00\x1fMerge x\x1e\n" +
      "b2\x1f\x1f2026-01-04T09:00:00+00:00\x1froot\x1e\n" +
      "bad\x1f\x1fnot-a-date\x1fx\x1e";
    expect(parseLog(out)).toEqual([
      { sha: "a1", parents: ["p1", "p2"], timestamp: "2026-01-05T09:00:00+00:00", subject: "Merge x" },
      { sha: "b2", parents: [], timestamp: "2026-01-04T09:00:00+00:00", subject: "root" },
    ]);
  });
});

describe("repo identity", () => {
  it("matches ssh and https forms of one remote", () => {
    const forms = [
      "git@github.com:Acme/Demo.git",
      "https://github.com/acme/demo",
      "https://user:tok@github.com/acme/demo.git/",
      "ssh://git@github.com:22/acme/demo.git",
    ];
    for (const f of forms) expect(normalizeRemoteUrl(f)).toBe("github.com/acme/demo");
  });

  it("ignores path: same remote and first commit give the same key", () => {
    expect(repoKey("git@h:o/r.git", "abc")).toBe(repoKey("https://h/o/r", "abc"));
    expect(repoKey("https://h/o/r", "abc")).not.toBe(repoKey("https://h/o/r", "def"));
    expect(repoKey(null, null)).toBeNull();
  });
});

const commit = (sha: string, parents: string[], subject = "s"): GitCommit => ({
  sha,
  parents,
  subject,
  timestamp: "2026-01-05T09:00:00Z",
});

const input = (over: Partial<ScanInput>): ScanInput => ({
  repoKey: "r#1",
  worktreePath: "/w",
  status: { head: "h2", branch: "main", dirty: [] },
  newCommits: [],
  now: "2026-01-05T10:00:00Z",
  ...over,
});

describe("diffScan", () => {
  it("first scan emits a worktree.scanned and no checkout", () => {
    const r = diffScan(
      null,
      input({ status: { head: "h", branch: "main", dirty: [{ path: "a", status: ".M" }] } }),
    );
    expect(r.events.map((e) => e.kind)).toEqual(["worktree.scanned"]);
    expect(r.events[0]?.payload["dirty"]).toEqual([{ path: "a", status: ".M" }]);
  });

  it("emits commits oldest first, classifying merges and reverts", () => {
    const prev = { head: "h0", branch: "main", dirtyKey: "" };
    const r = diffScan(
      prev,
      input({
        newCommits: [
          commit("c3", ["c2"], 'Revert "x"'),
          commit("c2", ["c1", "z"], "Merge z"),
          commit("c1", ["h0"], "feat"),
        ],
      }),
    );
    expect(r.events.map((e) => [e.kind, e.payload["sha"]])).toEqual([
      ["commit.created", "c1"],
      ["merge.completed", "c2"],
      ["revert.created", "c3"],
    ]);
  });

  it("emits branch.checked_out only when the branch changes", () => {
    const prev = { head: "h", branch: "main", dirtyKey: "" };
    const moved = diffScan(prev, input({ status: { head: "h", branch: "feat/x", dirty: [] } }));
    expect(moved.events.map((e) => e.kind)).toEqual(["branch.checked_out"]);
    expect(moved.events[0]?.payload).toMatchObject({ from: "main", to: "feat/x" });
    expect(diffScan(prev, input({ status: { head: "h", branch: "main", dirty: [] } })).events).toEqual([]);
  });

  it("emits worktree.scanned only when the dirty set changes", () => {
    const dirty = [{ path: "a", status: ".M" }];
    const first = diffScan(null, input({ status: { head: "h", branch: "main", dirty } }));
    const same = diffScan(first.state, input({ status: { head: "h", branch: "main", dirty } }));
    expect(same.events).toEqual([]);
    const clean = diffScan(first.state, input({ status: { head: "h", branch: "main", dirty: [] } }));
    expect(clean.events.map((e) => e.kind)).toEqual(["worktree.scanned"]);
  });

  it("gives commits stable source ids so re-scans deduplicate", () => {
    const a = diffScan(null, input({ newCommits: [commit("c1", [])] }));
    const b = diffScan(null, input({ newCommits: [commit("c1", [])], now: "2026-01-06T00:00:00Z" }));
    expect(a.events[0]?.sourceId).toBe(b.events[0]?.sourceId);
  });
});

describe("scanIntervalMs", () => {
  it("is 30 s when active, 10 min otherwise, doubled on battery saver", () => {
    expect(scanIntervalMs(1_000, 2_000)).toBe(30_000);
    expect(scanIntervalMs(null, 2_000)).toBe(600_000);
    expect(scanIntervalMs(0, 700_000)).toBe(600_000);
    expect(scanIntervalMs(1_000, 2_000, true)).toBe(60_000);
  });
});
