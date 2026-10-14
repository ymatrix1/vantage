// Git adapter shell: runs read-only git, feeds pure logic in @vantage/core.
// Spec: docs/specs/ingestion.md (git row, polling budget).
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  LOG_FORMAT,
  diffScan,
  parseLog,
  parseStatus,
  parseWorktreeList,
  repoKey,
  type GitCommit,
  type ScanState,
  type VantageEvent,
  type WorktreeInfo,
} from "@vantage/core";

const run = promisify(execFile);

/** First scan of a worktree emits at most this many past commits. */
const BACKFILL_COMMITS = 50;

/** Read-only git: `--no-optional-locks` keeps status from taking index.lock. */
async function git(cwd: string, args: string[], env?: NodeJS.ProcessEnv): Promise<string> {
  const { stdout } = await run("git", ["--no-optional-locks", ...args], {
    cwd,
    env: { ...process.env, ...env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

async function gitOrNull(cwd: string, args: string[], env?: NodeJS.ProcessEnv): Promise<string | null> {
  try {
    return await git(cwd, args, env);
  } catch {
    return null;
  }
}

export interface RepoIdentity {
  key: string;
  remote: string | null;
  firstCommit: string | null;
}

export async function readRepoIdentity(path: string, env?: NodeJS.ProcessEnv): Promise<RepoIdentity | null> {
  const remote = (await gitOrNull(path, ["config", "--get", "remote.origin.url"], env))?.trim() || null;
  const roots =
    (await gitOrNull(path, ["rev-list", "--max-parents=0", "HEAD"], env))?.trim().split("\n") ?? [];
  const firstCommit = roots.filter(Boolean).toSorted()[0] ?? null;
  const key = repoKey(remote, firstCommit);
  return key ? { key, remote, firstCommit } : null;
}

/** All worktrees of the repo containing `path` (the main one included), bare entries dropped. */
export async function discoverWorktrees(path: string, env?: NodeJS.ProcessEnv): Promise<WorktreeInfo[]> {
  const out = await gitOrNull(path, ["worktree", "list", "--porcelain", "-z"], env);
  return out === null ? [] : parseWorktreeList(out).filter((w) => !w.bare);
}

export interface GitScanner {
  /** Scans every registered repo and its worktrees once; returns the new events. */
  scan(now?: Date): Promise<VantageEvent[]>;
  /** Scan state per worktree path, for persisting cursors. */
  state(): ReadonlyMap<string, ScanState>;
}

export interface GitScannerOptions {
  repos: readonly string[];
  /** Extra environment for git (tests isolate config and identity here). */
  env?: NodeJS.ProcessEnv;
  /** Cursors from a previous run. */
  initialState?: ReadonlyMap<string, ScanState>;
}

export function createGitScanner(options: GitScannerOptions): GitScanner {
  const states = new Map<string, ScanState>(options.initialState ?? []);
  const env = options.env;

  async function newCommits(path: string, prev: ScanState | null, head: string | null): Promise<GitCommit[]> {
    if (!head) return [];
    const fmt = `--format=${LOG_FORMAT}`;
    if (prev?.head) {
      if (prev.head === head) return [];
      const out = await gitOrNull(path, ["log", fmt, `${prev.head}..${head}`], env);
      if (out !== null) return parseLog(out);
    }
    const out = await gitOrNull(path, ["log", fmt, "-n", String(BACKFILL_COMMITS), head], env);
    return out === null ? [] : parseLog(out);
  }

  return {
    state: () => states,
    async scan(now = new Date()) {
      const events: VantageEvent[] = [];
      const seen = new Set<string>();
      const emitted = new Set<string>();
      for (const registered of options.repos) {
        for (const wt of await discoverWorktrees(registered, env)) {
          if (seen.has(wt.path)) continue;
          seen.add(wt.path);
          const statusOut = await gitOrNull(wt.path, ["status", "--porcelain=v2", "--branch", "-z"], env);
          if (statusOut === null) continue; // worktree gone or unreadable
          const status = parseStatus(statusOut);
          const identity = await readRepoIdentity(wt.path, env);
          if (!identity) continue;
          const prev = states.get(wt.path) ?? null;
          const result = diffScan(prev, {
            repoKey: identity.key,
            worktreePath: wt.path,
            status,
            newCommits: await newCommits(wt.path, prev, status.head),
            now: now.toISOString(),
          });
          states.set(wt.path, result.state);
          for (const e of result.events) {
            // Worktrees of one repo share commits; emit each commit event once per scan.
            if (emitted.has(e.sourceId)) continue;
            emitted.add(e.sourceId);
            events.push(e);
          }
        }
      }
      return events;
    },
  };
}
