// The Claude Code settings.json `hooks` block that registers the collector (D59: async, spool only)
// and the Stop gate (synchronous: it may answer the agent).

export const SPOOL_HOOK_EVENTS = [
  "SessionStart",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "Notification",
  "PreCompact",
  "SessionEnd",
] as const;

interface HookCommand {
  type: "command";
  command: string;
  async?: true;
}

/**
 * `command` is the full shell command that runs the built bin.js, for example `node /path/to/bin.js`.
 * `Stop` is the only synchronous entry (D59): the same command appends `session.stopped` to the spool
 * and runs the proof gate, so the agent sees the gate's answer.
 */
export function hooksSettings(command: string): Record<string, { hooks: HookCommand[] }[]> {
  const spool: [string, { hooks: HookCommand[] }[]][] = SPOOL_HOOK_EVENTS.map((event) => [
    event,
    [{ hooks: [{ type: "command", command, async: true }] }],
  ]);
  return Object.fromEntries([...spool, ["Stop", [{ hooks: [{ type: "command", command }] }]]]);
}

/** Refresh every 30 s so an idle session still updates (research R2). */
export const STATUS_LINE_REFRESH_SECONDS = 30;

/** The settings.json `statusLine` block. `command` runs statusline.js, for example `node /path/to/statusline.js`. */
export function statusLineSettings(command: string): {
  statusLine: { type: "command"; command: string; refreshInterval: number };
} {
  return { statusLine: { type: "command", command, refreshInterval: STATUS_LINE_REFRESH_SECONDS } };
}
