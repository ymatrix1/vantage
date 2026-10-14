// Hook collector: wraps one Claude Code hook payload and appends it to the spool (D21, D59).
// Runtime imports are node built-ins only, so startup stays well under the 100 ms budget.
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function vantageHome(env: NodeJS.ProcessEnv = process.env): string {
  return env["VANTAGE_HOME"] || join(homedir(), ".vantage");
}

export function spoolDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(vantageHome(env), "spool");
}

/** Appends `{v, receivedAt, hook}` as one line to the day's spool file. Returns false when stdin isn't a JSON object. */
export function collect(stdin: string, dir: string, now: Date = new Date()): boolean {
  let hook: unknown;
  try {
    hook = JSON.parse(stdin);
  } catch {
    return false;
  }
  if (typeof hook !== "object" || hook === null || Array.isArray(hook)) return false;
  mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({ v: 1, receivedAt: now.toISOString(), hook }) + "\n";
  // One appendFileSync is one O_APPEND write, so concurrent hooks don't interleave lines.
  appendFileSync(join(dir, `${now.toISOString().slice(0, 10)}.jsonl`), line);
  return true;
}
