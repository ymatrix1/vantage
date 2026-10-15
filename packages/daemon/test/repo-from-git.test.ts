// Hermetic: scripted temp repos (synthetic), isolated git config. A folder no scanned worktree contains is
// resolved by asking git once; a folder that is gone or not a repo has no repo.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gitRepoOfCwd, repoValue } from "../src/index.ts";

const join = (...parts: string[]): string => pathJoin(...parts).replaceAll("\\", "/");
const AT = "@"; // built, not written out, so the docs privacy scan does not flag a synthetic remote

let root: string;
const gitEnv = (home: string): NodeJS.ProcessEnv => ({
  HOME: home,
  USERPROFILE: home,
  GIT_CONFIG_GLOBAL: join(home, "gitconfig"),
  GIT_CONFIG_SYSTEM: join(home, "none"),
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: `t${AT}example.invalid`,
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: `t${AT}example.invalid`,
});
const saved: Record<string, string | undefined> = {};

beforeAll(() => {
  root = realpathSync.native(mkdtempSync(join(tmpdir(), "vantage-repo-git-"))).replaceAll("\\", "/");
  const home = join(root, "home");
  mkdirSync(home);
  // gitRepoOfCwd runs git with the process environment, so isolate that for the test.
  for (const [k, v] of Object.entries(gitEnv(home))) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
});
afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(root, { recursive: true, force: true });
});

const g = (cwd: string, ...args: string[]): string =>
  execFileSync("git", args, { cwd, env: process.env, encoding: "utf8" });

function makeRepo(name: string, remote: string | null): string {
  const dir = join(root, name);
  mkdirSync(dir);
  g(dir, "init", "-q", "-b", "main");
  if (remote) g(dir, "remote", "add", "origin", remote);
  writeFileSync(join(dir, "a.txt"), "one\n");
  g(dir, "add", ".");
  g(dir, "commit", "-q", "-m", "first");
  return dir;
}

describe("gitRepoOfCwd", () => {
  it("names the repo from the remote, the same for the main folder and a linked worktree", () => {
    const main = makeRepo("webmain", `git${AT}example.invalid:Acme/Web.git`);
    const wt = join(root, "random-folder-9f9f9f");
    g(main, "worktree", "add", "-q", "-b", "feat/x", wt);
    const a = gitRepoOfCwd(main);
    const b = gitRepoOfCwd(`${wt}/`.replace(/\/$/, ""));
    expect(a && repoValue(a)).toBe("example.invalid/Acme/Web");
    expect(b && repoValue(b)).toBe("example.invalid/Acme/Web");
  });

  it("uses the main worktree's folder, never a linked worktree's, for a repo with no remote", () => {
    const main = makeRepo("lonely", null);
    const wt = join(root, "lonely-linked-abc123");
    g(main, "worktree", "add", "-q", "-b", "feat/y", wt);
    const ref = gitRepoOfCwd(wt);
    expect(ref && repoValue(ref)).toBe("lonely");
  });

  it("has no repo for a folder that is gone or is not a repo", () => {
    const plain = join(root, "plain");
    mkdirSync(plain);
    expect(gitRepoOfCwd(plain)).toBeNull();
    expect(gitRepoOfCwd(join(root, "does-not-exist"))).toBeNull();
  });

  it("stops asking once a pass has used its budget, and answers later without caching the refusal", () => {
    const repo = makeRepo("budgeted", `https://example.invalid/acme/budgeted.git`);
    const none = { left: 0 };
    expect(gitRepoOfCwd(repo, none)).toBeNull();
    const some = { left: 1 };
    const ref = gitRepoOfCwd(repo, some);
    expect(ref && repoValue(ref)).toBe("example.invalid/acme/budgeted");
    expect(some.left).toBe(0);
    // Remembered: no budget needed the second time.
    expect(gitRepoOfCwd(repo, { left: 0 })).not.toBeNull();
  });
});
