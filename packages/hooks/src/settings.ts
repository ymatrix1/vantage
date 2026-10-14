// The Claude Code settings.json `hooks` block that registers the collector (D59: async, spool only).

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
  async: true;
}

/** `command` is the full shell command that runs bin.ts, for example `node /path/to/bin.ts`. */
export function hooksSettings(command: string): Record<string, { hooks: HookCommand[] }[]> {
  return Object.fromEntries(
    SPOOL_HOOK_EVENTS.map((event) => [event, [{ hooks: [{ type: "command", command, async: true }] }]]),
  );
}

/** Refresh every 30 s so an idle session still updates (research R2). */
export const STATUS_LINE_REFRESH_SECONDS = 30;

/** The settings.json `statusLine` block. `command` runs statusline.js, for example `node /path/to/statusline.js`. */
export function statusLineSettings(command: string): {
  statusLine: { type: "command"; command: string; refreshInterval: number };
} {
  return { statusLine: { type: "command", command, refreshInterval: STATUS_LINE_REFRESH_SECONDS } };
}
