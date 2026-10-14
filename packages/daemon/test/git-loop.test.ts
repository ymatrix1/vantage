// Hermetic: synthetic temp repos, isolated git config, injected clock and fake timers, in-memory store.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Store, createGitLoop } from "../src/index.ts";

const join = (...parts: string[]): string => pathJoin(...parts).replaceAll("\\", "/");
const AT = "@";

let root: string;
let env: NodeJS.ProcessEnv;
let n = 0;

beforeAll(() => {
  root = realpathSync.native(mkdtempSync(join(tmpdir(), "vantage-loop-"))).replaceAll("\\", "/");
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
afterEach(() => vi.useRealTimers());

function g(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, env: { ...process.env, ...env }, encoding: "utf8" });
}

function makeRepo(): string {
  const dir = join(root, `repo${n++}`);
  mkdirSync(dir);
  g(dir, "init", "-q", "-b", "main");
  g(dir, "remote", "add", "origin", `git${AT}example.invalid:acme/loop.git`);
  writeFileSync(join(dir, "a.txt"), "one\n");
  g(dir, "add", ".");
  g(dir, "commit", "-q", "-m", "first");
  return dir;
}

function commit(dir: string, file: string): void {
  writeFileSync(join(dir, file), "x\n");
  g(dir, "add", ".");
  g(dir, "commit", "-q", "-m", file);
}

const T0 = Date.parse("2026-01-05T10:00:00Z");
const at = (ms: number): Date => new Date(T0 + ms);

function setup(opts: { batterySaver?: () => boolean } = {}) {
  const store = new Store(":memory:");
  const repo = makeRepo();
  let clock = 0;
  const loop = createGitLoop({ store, repos: [repo], env, now: () => at(clock), ...opts });
  return { store, repo, loop, advance: (ms: number) => (clock += ms) };
}

const commitsStored = (s: Store): number =>
  Number(s.db.prepare("SELECT COUNT(*) AS c FROM events WHERE kind='commit.created'").get()?.["c"]);

describe("git scan loop", () => {
  it("applies the 10 min idle cadence until activity, then 30 s", async () => {
    const { store, repo, loop, advance } = setup();
    await loop.tick();
    commit(repo, "b.txt");
    advance(30_000);
    expect(await loop.tick()).toBe(0); // idle: not due before 10 min
    advance(570_000);
    expect(await loop.tick()).toBeGreaterThan(0); // due at 10 min; commit seen -> now active
    commit(repo, "c.txt");
    advance(29_000);
    expect(await loop.tick()).toBe(0); // active: not due at 29 s
    advance(1_000);
    expect(await loop.tick()).toBeGreaterThan(0); // due at 30 s
    expect(commitsStored(store)).toBe(3);
  });

  it("doubles intervals on battery saver", async () => {
    let saver = false;
    const { repo, loop, advance } = setup({ batterySaver: () => saver });
    await loop.tick();
    commit(repo, "b.txt");
    advance(600_000);
    await loop.tick(); // active now
    saver = true;
    commit(repo, "c.txt");
    advance(30_000);
    expect(await loop.tick()).toBe(0);
    advance(30_000);
    expect(await loop.tick()).toBeGreaterThan(0);
  });

  it("persists cursors so a restarted loop does not re-emit", async () => {
    const { store, repo, loop } = setup();
    await loop.tick();
    const before = store.countEvents();
    const restarted = createGitLoop({ store, repos: [repo], env, now: () => at(0) });
    expect(await restarted.tick()).toBe(0);
    expect(store.countEvents()).toBe(before);
    expect(store.getCursorText(`git:${repo}`)).toContain("head");
  });

  it("deduplicates by sourceId through the store insert", async () => {
    const { store, repo, advance } = setup();
    const a = createGitLoop({ store, repos: [repo], env, now: () => at(0) });
    await a.tick();
    store.db.prepare("DELETE FROM cursors").run(); // lose cursors: scanner re-emits everything
    const b = createGitLoop({ store, repos: [repo], env, now: () => at(advance(1)) });
    const before = store.countEvents();
    await b.tick();
    expect(commitsStored(store)).toBe(1);
    expect(store.countEvents() - before).toBeLessThanOrEqual(1); // only the new worktree.scanned may differ
  });

  it("schedules ticks on timers and stops cleanly", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { store, repo, loop } = setup();
    loop.start();
    await vi.waitFor(() => expect(commitsStored(store)).toBe(1));
    commit(repo, "b.txt");
    // not yet active, so the next timer tick finds nothing due; just assert the timer is armed and stop is clean
    expect(vi.getTimerCount()).toBe(1);
    await loop.stop();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(commitsStored(store)).toBe(1);
  });
});
