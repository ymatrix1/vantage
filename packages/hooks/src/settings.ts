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
