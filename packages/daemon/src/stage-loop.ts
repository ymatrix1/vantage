// Scheduled link and stage pass. Ingest, the git scanner and the hooks only append events; this
// loop turns them into links, stages, proofs and flags on a fixed cadence.
import { runStagePass, type StagePassOptions, type StagePassResult } from "./stages.ts";
import type { Store } from "./store.ts";

export const STAGE_PASS_MS = 30_000;

export interface StageLoopOptions {
  store: Store;
  pass?: StagePassOptions;
  intervalMs?: number;
  /** Test seam; defaults to the wall clock. */
  now?: () => Date;
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
  const tick = (): StagePassResult => runStagePass(options.store, options.pass ?? {}, now());
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
