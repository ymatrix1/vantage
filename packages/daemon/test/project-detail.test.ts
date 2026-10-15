// Synthetic events only. The project an item belongs to (from the git remote, never the worktree folder)
// and the inline detail view (sessions, files, worktree, last commit).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VantageEvent } from "@vantage/core";
import { Store, itemDetailView, listItems, repoKeyForCwd, runStagePass } from "../src/index.ts";

let dir = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-detail-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const NOW = new Date("2026-01-05T11:00:00Z");
const KEY = "github.com/acme/web#abc123";
const WT = "C:\\work\\brave-joliot-995ebc";
let n = 0;
const put = (e: Omit<VantageEvent, "sourceId" | "source"> & { source?: string; sourceId?: string }): void => {
  store.insertEvent({ source: "claude_code", sourceId: `e${++n}`, ...e }, "2026-01-05T10:00:00Z");
};

function seed(): void {
  put({
    source: "git",
    sourceId: `git:${KEY}:scan:${WT}:x:1`,
    kind: "worktree.scanned",
    timestamp: "2026-01-05T09:00:00Z",
    payload: { worktree: WT, branch: "feat/ftk-1-demo", head: "aaaaaaa", dirty: [] },
  });
  put({
    source: "git",
    sourceId: `git:${KEY}:commit:deadbeef1234`,
    kind: "commit.created",
    timestamp: "2026-01-05T09:30:00Z",
    payload: { sha: "deadbeef1234", branch: "feat/ftk-1-demo", worktree: WT, subject: "x", parents: [] },
  });
  const base = { sessionId: "s1", payload: { branch: "feat/ftk-1-demo", cwd: `${WT}\\packages\\ui` } };
  put({
    ...base,
    kind: "file.edited",
    timestamp: "2026-01-05T09:10:00Z",
    payload: { ...base.payload, path: "C:\\work\\x\\src\\App.svelte" },
  });
  put({
    ...base,
    kind: "file.edited",
    timestamp: "2026-01-05T09:11:00Z",
    payload: { ...base.payload, paths: ["a/b/util.ts", "a/b/App.svelte"] },
  });
  put({
    sessionId: "s2",
    kind: "file.edited",
    timestamp: "2026-01-05T09:40:00Z",
    payload: { branch: "feat/ftk-1-demo", cwd: WT, path: "/w/c.ts" },
  });
  put({
    sessionId: "s2",
    kind: "session.derived",
    timestamp: "2026-01-05T09:39:00Z",
    payload: { branch: "feat/ftk-1-demo", parentSessionId: "s1" },
  });
}

describe("project of an item", () => {
  it("is the git remote, not the worktree folder the session ran in", () => {
    seed();
    runStagePass(store, {}, NOW);
    const items = listItems(store);
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i.repo).toBe("github.com/acme/web");
      expect(JSON.stringify(i)).not.toContain("brave-joliot");
    }
  });

  it("falls back to what the events said when no worktree matches", () => {
    put({
      sessionId: "s9",
      kind: "file.edited",
      timestamp: "2026-01-05T09:10:00Z",
      payload: { branch: "feat/ftk-2-x", cwd: "/elsewhere/proj", path: "/elsewhere/proj/a.ts" },
    });
    runStagePass(store, {}, NOW);
    expect(listItems(store).map((i) => i.repo)).toEqual(["proj"]);
  });

  it("matches the longest worktree path, case and slash style aside", () => {
    const index = new Map([
      ["c:/work", "k/one#1"],
      ["c:/work/brave", "k/two#2"],
    ]);
    expect(repoKeyForCwd("C:\\Work\\Brave\\pkg", index)).toBe("k/two#2");
    expect(repoKeyForCwd("C:\\work\\bravo", index)).toBe("k/one#1");
    expect(repoKeyForCwd("D:\\other", index)).toBeNull();
  });
});

describe("item detail", () => {
  it("lists sessions with their parent, edited file base names, worktree and last commit", () => {
    seed();
    runStagePass(store, {}, NOW);
    const key = listItems(store)[0]?.itemKey ?? "";
    const d = itemDetailView(store, key);
    expect(d?.repoUrl).toBe("https://github.com/acme/web");
    expect(d?.branch).toBe("feat/ftk-1-demo");
    expect(d?.lastCommitSha).toBe("deadbeef1234");
    expect(d?.files).toEqual({ names: ["App.svelte", "util.ts", "c.ts"], total: 3 });
    expect(d?.sessions.map((s) => [s.id, s.parentId])).toEqual([
      ["s1", null],
      ["s2", "s1"],
    ]);
    expect(d?.worktreePath).toContain("brave-joliot-995ebc");
  });

  it("is null for an unknown item, and holds no markup-bearing free text beyond ids and names", () => {
    expect(itemDetailView(store, "issue:NOPE")).toBeNull();
  });
});
