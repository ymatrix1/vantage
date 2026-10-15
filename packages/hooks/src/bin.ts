// Entry point registered as the Claude Code hook command. Never fails the agent: always exits 0.
import { readFileSync, writeSync } from "node:fs";
import { collect, spoolDir, vantageHome } from "./collect.ts";
import { runGate } from "./gate.ts";

// A session Vantage starts itself (`vantage classify` runs `claude -p`) sets VANTAGE_SKIP=1. Its hooks
// must record nothing, or the classifier would create items about itself.
const skip = (process.env["VANTAGE_SKIP"] ?? "").trim();
if (skip !== "" && skip !== "0") process.exit(0);

let stdin = "";
try {
  stdin = readFileSync(0, "utf8");
  collect(stdin, spoolDir());
} catch {
  // Swallow everything: a broken spool must not break or slow the session.
}
try {
  // Only the Stop hook runs synchronously and may answer the agent; spool hooks stay silent.
  if (/"hook_event_name"\s*:\s*"Stop"/.test(stdin)) {
    const out = await runGate(stdin, vantageHome());
    if (out.stdout) writeSync(1, out.stdout + "\n");
  }
} catch {
  // The gate must never throw into the agent.
}
process.exit(0);
