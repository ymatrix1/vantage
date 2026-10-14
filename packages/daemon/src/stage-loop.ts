// Scheduled link and stage pass. Ingest, the git scanner and the hooks only append events; this
// loop turns them into links, stages, proofs and flags on a fixed cadence.
import { writeStatusFile } from "./status-file.ts";
import { runStagePass, type StagePassOptions, type StagePassResult } from "./stages.ts";
import type { Store } from "./store.ts";

export const STAGE_PASS_MS = 30_000;

export interface StageLoopOptions {
  store: Store;
  pass?: StagePassOptions;
  intervalMs?: number;
  /** When set, the status line summary is rewritten after every pass (docs/specs/status-line.md). */
  statusFile?: string;
  /** Test seam; defaults to the wall clock. */
  now?: () => Date;
  /** Called after every successful pass, e.g. to push the changes to live clients. */
  onPass?: (result: StagePassResult, at: Date) => void;
  /** Receives errors from a pass; the loop keeps running. */
  onError?: (e: unknown) => void;
}

export interface StageLoop {
  /** Runs one pass now. */
  tick(): StagePassResult;
  start(): void;
  stop(): void;
}

export function createStageLoop(options: StageLoopOptions): StageLoop {
  const now = options.now ?? (() => new Date());
  let timer: ReturnType<typeof setInterval> | null = null;
  const tick = (): StagePassResult => {
    const at = now();
    const result = runStagePass(options.store, options.pass ?? {}, at);
    if (options.statusFile) {
      try {
        writeStatusFile(options.store, options.statusFile, at);
      } catch (e) {
        options.onError?.(e); // a failed write must not hide the pass result
      }
    }
    try {
      options.onPass?.(result, at);
    } catch (e) {
      options.onError?.(e); // a failed push must not hide the pass result
    }
    return result;
  };
  const safe = (): void => {
    try {
      tick();
    } catch (e) {
      options.onError?.(e);
    }
  };
  return {
    tick,
    start() {
      if (timer) return;
      safe();
      timer = setInterval(safe, options.intervalMs ?? STAGE_PASS_MS);
      timer.unref();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
