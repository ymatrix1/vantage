// Scheduling loop for the git scanner. Spec: docs/specs/ingestion.md (polling budget).
// Each worktree is scanned on its own cadence (scanIntervalMs); scan state persists in the
// `cursors` table so a restart resumes instead of re-emitting.
import { ACTIVE_SCAN_MS, scanIntervalMs, type ScanState } from "@vantage/core";
import { createGitScanner, type GitScanner } from "./git-scanner.ts";
import type { Store } from "./store.ts";

const CURSOR_PREFIX = "git:";

export interface GitLoopOptions {
  store: Store;
  repos: readonly string[];
  env?: NodeJS.ProcessEnv;
  /** Returns true while the machine is in battery saver; doubles every interval. */
  batterySaver?: () => boolean;
  /** Test seam; defaults to the wall clock. */
  now?: () => Date;
  /** Receives errors from a tick; the loop keeps running. */
  onError?: (e: unknown) => void;
}

export interface GitLoop {
  /** Runs one tick now: scans the due worktrees, stores events and cursors. Returns events inserted. */
  tick(): Promise<number>;
  start(): void;
  /** Stops scheduling and waits for an in-flight tick to finish. */
  stop(): Promise<void>;
}

function isScanState(v: unknown): v is ScanState {
  return typeof v === "object" && v !== null && "head" in v && "branch" in v && "dirtyKey" in v;
}

function loadStates(store: Store): Map<string, ScanState> {
  const out = new Map<string, ScanState>();
  for (const row of store.db.prepare("SELECT source, cursor FROM cursors WHERE source LIKE 'git:%'").all()) {
    const { source, cursor } = row;
    if (typeof source !== "string" || typeof cursor !== "string") continue;
    try {
      const state: unknown = JSON.parse(cursor);
      if (isScanState(state)) out.set(source.slice(CURSOR_PREFIX.length), state);
    } catch {
      // corrupt cursor: drop it, the worktree is rescanned from scratch
    }
  }
  return out;
}

export function createGitLoop(options: GitLoopOptions): GitLoop {
  const { store } = options;
  const now = options.now ?? (() => new Date());
  const scanner: GitScanner = createGitScanner({
    repos: options.repos,
    ...(options.env ? { env: options.env } : {}),
    initialState: loadStates(store),
  });
  const lastScan = new Map<string, number>();
  const lastActivity = new Map<string, number>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<number> | null = null;
  let stopped = true;

  const interval = (path: string, nowMs: number): number =>
    scanIntervalMs(lastActivity.get(path) ?? null, nowMs, options.batterySaver?.() ?? false);

  async function runTick(): Promise<number> {
    const at = now();
    const nowMs = at.getTime();
    const touched = new Set<string>();
    const events = await scanner.scan(at, {
      due: (path) => {
        const last = lastScan.get(path);
        return last === undefined || nowMs - last >= interval(path, nowMs);
      },
      onWorktree: (path, evs, hadState) => {
        touched.add(path);
        lastScan.set(path, nowMs);
        // The first scan of a new worktree is backfill, not activity.
        if (hadState && evs.length > 0) lastActivity.set(path, nowMs);
      },
    });
    const iso = at.toISOString();
    return store.transaction(() => {
      let inserted = 0;
      for (const e of events) if (store.insertEvent(e, iso)) inserted++;
      for (const path of touched) {
        const state = scanner.state().get(path);
        if (state) store.setCursorText(CURSOR_PREFIX + path, JSON.stringify(state), iso);
      }
      return inserted;
    });
  }

  function tick(): Promise<number> {
    // One tick at a time; a caller during a running tick joins it.
    running ??= runTick().finally(() => {
      running = null;
    });
    return running;
  }

  function schedule(): void {
    if (stopped) return;
    timer = setTimeout(() => {
      timer = null;
      tick()
        .catch((e: unknown) => options.onError?.(e))
        .finally(schedule);
    }, ACTIVE_SCAN_MS);
  }

  return {
    tick,
    start() {
      if (!stopped) return;
      stopped = false;
      // Scan at once, then check what is due every active interval (the shortest cadence).
      tick()
        .catch((e: unknown) => options.onError?.(e))
        .finally(schedule);
    },
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
      await running?.catch(() => undefined);
    },
  };
}
