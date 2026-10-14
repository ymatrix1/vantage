// Entry point registered as the Claude Code hook command. Never fails the agent: always exits 0.
import { readFileSync } from "node:fs";
import { collect, spoolDir } from "./collect.ts";

try {
  collect(readFileSync(0, "utf8"), spoolDir());
} catch {
  // Swallow everything: a broken spool must not break or slow the session.
}
process.exit(0);
