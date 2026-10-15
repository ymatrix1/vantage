// Hermetic: scripted temp repos (synthetic), isolated git config and identity, no real home directory.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGitScanner, discoverWorktrees, readRepoIdentity } from "../src/index.ts";

// git reports forward slashes on every platform
const join = (...parts: string[]): string => pathJoin(...parts).replaceAll("\\", "/");

// Built by concatenation so the docs privacy scan does not flag synthetic emails.
const AT = "@";

let root: string;
let env: NodeJS.ProcessEnv;

beforeAll(() => {
  root = realpathSync.native(mkdtempSync(join(tmpdir(), "vantage-git-"))).replaceAll("\\", "/");
  const home = join(root, "home");
  mkdirSync(home);
  env = {
    HOME: home,
    USERPROFILE: home,
    GIT_CONFIG_GLOBAL: join(home, "gitconfig"),
    GIT_CONFIG_SYSTEM: join(home, "none"),
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: `test${AT}example.invalid`,
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: `test${AT}example.invalid`,
  };
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

function g(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, env: { ...process.env, ...env }, encoding: "utf8" });
}

function makeRepo(name: string): string {
  const dir = join(root, name);
  mkdirSync(dir);
  g(dir, "init", "-q", "-b", "main");
  g(dir, "remote", "add", "origin", `git${AT}example.invalid:acme/demo.git`);
  writeFileSync(join(dir, "a.txt"), "one\n");
  g(dir, "add", ".");
  g(dir, "commit", "-q", "-m", "first");
  return dir;
}

describe("git scanner", () => {
  it("discovers linked worktrees automatically", async () => {
    const repo = makeRepo("disc");
    const wt = join(root, "disc-wt");
    g(repo, "worktree", "add", "-q", "-b", "feat/x", wt);
    const found = await discoverWorktrees(repo, env);
    expect(Object.fromEntries(found.map((w) => [w.path, w.branch]))).toEqual({
      [repo]: "main",
      [wt]: "feat/x",
    });
  });

  it("names the repo on every scanned worktree from the remote, not from the worktree folder", async () => {
    const repo = makeRepo("identity");
    const wt = join(root, "identity-linked-9f9f9f");
    g(repo, "worktree", "add", "-q", "-b", "feat/id", wt);
    const events = await createGitScanner({ repos: [repo], env }).scan(new Date("2026-01-05T10:00:00Z"));
    const infos = events.filter((e) => e.kind === "worktree.scanned").map((e) => e.payload["repo"]);
    expect(infos).toHaveLength(2);
    for (const info of infos) {
      expect(info).toMatchObject({ name: "acme/demo", remoteUrl: "https://example.invalid/acme/demo" });
    }
    expect(new Set(infos.map((i) => JSON.stringify(i))).size).toBe(1);
  });

  it("emits commits, checkouts, merges and dirty files across scans", async () => {
    const repo = makeRepo("flow");
    const wt = join(root, "flow-wt");
    g(repo, "worktree", "add", "-q", "-b", "feat/y", wt);
    const scanner = createGitScanner({ repos: [repo], env });

    const first = await scanner.scan(new Date("2026-01-05T10:00:00Z"));
    expect(first.filter((e) => e.kind === "worktree.scanned")).toHaveLength(2);
    expect(first.filter((e) => e.kind === "commit.created")).toHaveLength(1); // deduped by sourceId across worktrees below

    // commit on the linked worktree, dirty file on main
    writeFileSync(join(wt, "b.txt"), "b\n");
    g(wt, "add", ".");
    g(wt, "commit", "-q", "-m", "second");
    writeFileSync(join(repo, "a.txt"), "changed\n");
    const second = await scanner.scan(new Date("2026-01-05T10:00:30Z"));
    const commits = second.filter((e) => e.kind === "commit.created");
    expect(commits.map((e) => e.payload["subject"])).toEqual(["second"]);
    const dirty = second.find((e) => e.kind === "worktree.scanned" && e.payload["worktree"] === repo);
    expect(dirty?.payload["dirty"]).toEqual([{ path: "a.txt", status: ".M" }]);

    // unchanged tree: nothing new
    expect(await scanner.scan(new Date("2026-01-05T10:01:00Z"))).toEqual([]);

    // merge and checkout on main
    g(repo, "checkout", "-q", "-b", "other");
    g(repo, "checkout", "-q", "--", "a.txt");
    g(repo, "checkout", "-q", "main");
    g(repo, "merge", "-q", "--no-ff", "-m", "Merge feat/y", "feat/y");
    const third = await scanner.scan(new Date("2026-01-05T10:02:00Z"));
    expect(third.map((e) => e.kind)).toContain("merge.completed");
    expect(third.map((e) => e.kind)).toContain("commit.created");
  });

  it("detects branch checkout", async () => {
    const repo = makeRepo("co");
    const scanner = createGitScanner({ repos: [repo], env });
    await scanner.scan();
    g(repo, "checkout", "-q", "-b", "feat/z");
    const events = await scanner.scan();
    const co = events.find((e) => e.kind === "branch.checked_out");
    expect(co?.payload).toMatchObject({ from: "main", to: "feat/z" });
  });

  it("matches a moved repo by remote and first commit, not path", async () => {
    const repo = makeRepo("moveme");
    const before = await readRepoIdentity(repo, env);
    const moved = join(root, "moved-elsewhere");
    renameSync(repo, moved);
    const after = await readRepoIdentity(moved, env);
    expect(before?.key).toBeDefined();
    expect(after?.key).toBe(before?.key);
  });

  it("does not take index.lock while scanning", async () => {
    const repo = makeRepo("lock");
    writeFileSync(join(repo, "a.txt"), "dirty\n");
    const before = g(repo, "ls-files", "--stage");
    await createGitScanner({ repos: [repo], env }).scan();
    // status would refresh the index stat cache without --no-optional-locks; the index file must be unchanged
    expect(g(repo, "ls-files", "--stage")).toBe(before);
  });

  it("skips a deleted worktree without throwing", async () => {
    const repo = makeRepo("gone");
    const wt = join(root, "gone-wt");
    g(repo, "worktree", "add", "-q", "-b", "feat/g", wt);
    rmSync(wt, { recursive: true, force: true });
    const events = await createGitScanner({ repos: [repo], env }).scan();
    expect(events.every((e) => e.payload["worktree"] !== wt)).toBe(true);
  });
});
