// The Claude Code status line command (docs/specs/status-line.md). Reads only the small summary file
// the daemon writes, never the database or the network, so it stays fast and prints a calm line
// when the daemon is down.
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { STATUS_FILE, parseStatusSummary, renderStatusLine } from "@vantage/core/status-line";
import { vantageHome } from "./collect.ts";

interface StatusStdin {
  session_id?: unknown;
  cwd?: unknown;
  workspace?: { repo?: { name?: unknown }; current_dir?: unknown };
}

/** Never throws: any failure renders the offline line. */
export function statusLine(stdin: string, env: NodeJS.ProcessEnv = process.env, now = new Date()): string {
  try {
    let input: StatusStdin = {};
    try {
      const parsed: unknown = JSON.parse(stdin);
      if (typeof parsed === "object" && parsed !== null) input = parsed;
    } catch {
      // No stdin, or not JSON: render without a session.
    }
    const dir = input.workspace?.current_dir ?? input.cwd;
    const repo = input.workspace?.repo?.name ?? (typeof dir === "string" ? basename(dir) : undefined);
    let summary = null;
    try {
      summary = parseStatusSummary(readFileSync(join(vantageHome(env), STATUS_FILE), "utf8"));
    } catch {
      // Missing or unreadable file: the daemon never ran or is gone.
    }
    const columns = Number(env["COLUMNS"]);
    return renderStatusLine(summary, {
      ...(typeof input.session_id === "string" ? { sessionId: input.session_id } : {}),
      ...(typeof repo === "string" && repo ? { repo } : {}),
      ...(columns > 0 ? { columns } : {}),
      color: !env["NO_COLOR"],
      quiet: env["VANTAGE_STATUSLINE_QUIET"] === "1",
      now,
    });
  } catch {
    return "vantage · offline";
  }
}
