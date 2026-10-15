// One ingest pass over the spool and the Claude Code transcripts.
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { backfillTranscripts, ingestSpool, workDirOf } from "./ingest.ts";
import { readRequestTitlesEnabled } from "./runtime.ts";
import { Store } from "./store.ts";

export interface RunOptions {
  /** Defaults to `$VANTAGE_HOME` or `~/.vantage`. */
  home?: string;
  /** Defaults to `~/.claude/projects`. */
  projectsDir?: string;
  now?: Date;
}

export function runOnce(opts: RunOptions = {}): { spool: number; transcripts: number } {
  const home = opts.home ?? (process.env["VANTAGE_HOME"] || join(homedir(), ".vantage"));
  const projectsDir = opts.projectsDir ?? join(homedir(), ".claude", "projects");
  mkdirSync(home, { recursive: true });
  const store = new Store(join(home, "vantage.db"));
  try {
    const spool = ingestSpool(store, join(home, "spool"), opts.now);
    const transcripts = backfillTranscripts(
      store,
      projectsDir,
      opts.now,
      undefined,
      readRequestTitlesEnabled(home),
      workDirOf(home),
    );
    return { spool: spool.inserted, transcripts: transcripts.inserted };
  } finally {
    store.close();
  }
}
