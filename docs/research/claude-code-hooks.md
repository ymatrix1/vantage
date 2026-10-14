# Research: Claude Code hooks, status line and telemetry

> **Bean:** R2 (`vantage-o3sq`). **Checked:** 2026-10-14. **Versions:** Claude Code CLI 2.1.295 (the build bundled with the Claude desktop app on Windows 11); docs at code.claude.com read the same day. The `claude` on `PATH` was older (2.1.146) and is not what the desktop app runs.

## Method

| Source | What |
|---|---|
| Docs, fetched 2026-10-14 | [Hooks reference](https://code.claude.com/docs/en/hooks), [Status line](https://code.claude.com/docs/en/statusline), [Monitoring (OpenTelemetry)](https://code.claude.com/docs/en/monitoring-usage), [Costs](https://code.claude.com/docs/en/costs), [Desktop](https://code.claude.com/docs/en/desktop) |
| Local experiment | Throwaway git project in a temp folder with a project-level `.claude/settings.json`. Every hook ran a Node script that appended its stdin JSON to a temp file. A 15-line Node HTTP server on `127.0.0.1:4318` recorded OTLP/HTTP JSON posts. The user's `~/.claude/settings.json` was not changed. |
| Command | `claude -p "<synthetic prompt>" --allowedTools Bash --model haiku < /dev/null` with `CLAUDE_CODE_ENABLE_TELEMETRY=1`, `OTEL_METRICS_EXPORTER=otlp`, `OTEL_LOGS_EXPORTER=otlp`, `OTEL_EXPORTER_OTLP_PROTOCOL=http/json`, `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318` set in the process environment only |
| Latency | PowerShell `Measure-Command`, 10 runs each, on the user's Windows 11 laptop |

**Limit of the experiment.** The standalone CLI could not authenticate (`Failed to authenticate: OAuth session expired and could not be refreshed`); the desktop app holds the login and this research did not touch credentials. So the run produced `SessionStart`, `SessionEnd` and telemetry, but **no model turn**: `PostToolUse`, `Stop`, `Notification`, `PreCompact`, the status line and prompt hooks were **not observed locally**. Their answers below rest on the docs only and are marked so. Follow-up bean `vantage-2vdj` (see [Follow-ups](#follow-ups)) reruns the same kit once the CLI is logged in.

Only field names and types are recorded here. Values in examples are synthetic.

## Answers

### 1. Payload shapes

Common fields on every hook (docs; `session_id`, `transcript_path`, `cwd`, `hook_event_name` and `prompt_id` also seen locally):

| Field | Type | Notes |
|---|---|---|
| `session_id` | string | Joins hooks, status line, transcript file and OTel `session.id` |
| `transcript_path` | string | JSONL transcript; docs say it may lag the in-memory conversation |
| `cwd` | string | Working directory when the hook runs |
| `hook_event_name` | string | |
| `prompt_id` | string (UUID) | Absent before the first user input. Matches OTel `prompt.id` |
| `permission_mode` | string | `default`, `plan`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions` (docs) |
| `effort` | object `{level}` | docs |
| `agent_id`, `agent_type` | string | Only inside a subagent (docs) |
| `scratchpad_dir` | string | docs; v2.1.257+ |

Per event:

| Event | Extra fields | Evidence |
|---|---|---|
| `SessionStart` | `source` (`startup`, `resume`, `clear`, `compact`, `fork`); optional `model`, `agent_type`, `session_title`; on resume: `seconds_since_last_response`, `context_tokens`, … | Seen locally: `session_id, transcript_path, cwd, hook_event_name, source` all strings, `source = "startup"`. `prompt_id` absent, as documented. |
| `PostToolUse` | `tool_name` (string), `tool_input` (object), `tool_response` (object, shape per tool), `tool_use_id` (string), optional `duration_ms` (number) | docs only |
| `Notification` | `message` (string), optional `title` (string), `notification_type` (string) | docs only |
| `Stop` | `stop_hook_active` (bool), `last_assistant_message` (string), `background_tasks` (array), `session_crons` (array) | docs only |
| `PreCompact` | `trigger` (`manual` or `auto`), `custom_instructions` (string or null) | docs only |
| `SessionEnd` | `reason` (string) | Seen locally: `reason = "other"` for a `-p` run that failed auth |

Synthetic `Stop` example:

```json
{
  "session_id": "00000000-0000-0000-0000-000000000001",
  "transcript_path": "/home/dev/.claude/projects/demo/00000000-0000-0000-0000-000000000001.jsonl",
  "cwd": "/home/dev/demo",
  "prompt_id": "00000000-0000-0000-0000-0000000000aa",
  "permission_mode": "default",
  "hook_event_name": "Stop",
  "stop_hook_active": false,
  "last_assistant_message": "Done. Tests pass.",
  "background_tasks": [],
  "session_crons": []
}
```

Other events worth knowing (docs): `PostToolUseFailure` (failed tool calls arrive here, **not** in `PostToolUse`), `PostCompact`, `SessionEnd`, `UserPromptSubmit`, `PermissionRequest`, `PermissionDenied`, `SubagentStop`, `StopFailure`, `CwdChanged`, `WorktreeCreate`.

### 2. Do permission prompts and questions fire `Notification`?

**Permission prompts: yes, per docs.** `notification_type = "permission_prompt"`. In the desktop app and the VS Code extension, permission requests go through the Agent SDK `canUseTool` callback and `permission_prompt` fires about six seconds after the request; `CLAUDE_CODE_DISABLE_PERMISSION_PROMPT_NOTIFY_HOOKS=1` turns it off. A sharper signal for "waiting on you" is the `PermissionRequest` hook, which fires at the request itself.

**Other waits, per docs:** `idle_prompt`, `elicitation_dialog`, `elicitation_url_dialog`, `agent_needs_input`, `agent_completed`, `auth_success`, `quota_auto_resume_*`.

**Questions from `AskUserQuestion`: not verified.** The docs don't say which `notification_type`, if any, it produces. Notification hooks can't block.

### 3. `Stop` hook: warn vs block

Per docs:

| Output | Effect |
|---|---|
| exit 0, no output | Claude stops |
| exit 0 + JSON `{"systemMessage": "..."}` | Claude stops; the message is shown **to the user** only |
| exit 0 + JSON `hookSpecificOutput.additionalContext` | Non-error feedback inserted at the end of the turn; the conversation **continues**, so this is not a pure warning |
| exit 0 + JSON `{"decision": "block", "reason": "..."}` | Claude keeps working with `reason` as its instruction |
| exit 2, stderr text | Same as block; stderr is the reason. Exit 2 wins over any JSON printed |
| any other exit code (including 1) | Non-blocking error: Claude stops, user sees a `hook error` notice |
| JSON `{"continue": false, "stopReason": "..."}` | Hard stop of processing, takes precedence |

Guards: a blocking Stop hook must check `stop_hook_active` to avoid loops. Claude Code ends the turn after 8 consecutive Stop-hook continuations (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`); the count resets on a tool call.

**So "warn" = exit 0 with `systemMessage`; "block" = exit 2 (or `decision: "block"`).** Not verified locally (no model turn).

### 4. Status line API and refresh

Per docs: `"statusLine": {"type": "command", "command": "...", "padding": 0, "refreshInterval": N}`. The command gets a JSON object on stdin with `session_id`, `session_name`, `prompt_id`, `transcript_path`, `cwd`, `model{id,display_name}`, `workspace{current_dir,project_dir,added_dirs,git_worktree,repo{host,owner,name}}`, `version`, `output_style`, `cost{total_cost_usd,total_duration_ms,total_api_duration_ms,total_lines_added,total_lines_removed}`, `context_window{…}`, `prompt_cache{…}`, `rate_limits{five_hour,seven_day}`. Each stdout line is a row; ANSI colors and OSC 8 links are allowed. `COLUMNS` and `LINES` are set in the environment (the script can't read the terminal size itself).

Runs: at session start or resume, on each new assistant message, after `/compact`, on permission-mode or vim-mode change, on settings change, and every `refreshInterval` seconds if set (minimum 1). Updates are **debounced at 300 ms**, and a run still in flight is **cancelled** when a new one starts. When the session is idle the event triggers stop, so time-based content needs `refreshInterval`. The status line is hidden during permission prompts. `disableAllHooks: true` also disables it. No API tokens are used.

Not verified locally. Whether the desktop app (Code tab) renders a status line at all is **not stated** in the docs and was not observed.

### 5. Do hooks run in Claude desktop app (Code tab) sessions?

**Yes for user-level and plugin hooks, observed.** This research ran in a Code tab session on 2026-10-14, and that session received output from `SessionStart` and `UserPromptSubmit` hooks defined in user settings and plugins. The desktop docs say "The desktop app reads the same settings files as the CLI." The desktop app runs its bundled CLI (2.1.295 here), not the `claude` on `PATH`.

Project-level hooks inside a Code tab session were not tested separately. In the headless run the telemetry showed hooks registered from `projectSettings`, `userSettings` and `pluginHook` together.

### 6. Prompt-type hooks: cheap yes/no judgments on the user's plan?

Per docs: `{"type": "prompt", "prompt": "... $ARGUMENTS ...", "model": "<optional>", "timeout": 30}`. The model must answer `{"ok": bool, "reason": string, "impossible": bool}`. Default model is "the model Claude Code uses for background functionality"; the docs don't name it. Default timeout 30 s. `agent` hooks are the multi-turn variant (60 s, up to 50 turns).

Supported on `Stop`, `SubagentStop`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `UserPromptSubmit`, `PermissionRequest` and a few task events. **Not** on `SessionStart`, `Notification`, `PreCompact`, `PostCompact`, `SessionEnd`.

On `Stop`, `ok: false` feeds `reason` back to Claude and the turn continues, unless `impossible: true`. On `PostToolUse` the default **ends the turn**.

Can a small model make cheap judgments? Mechanically yes: `model` can name a small model. But:

- Every call is a model request that counts against the user's plan (all Claude Code usage does, per the costs page). No per-call cost figure is documented.
- A model call takes seconds, not under 100 ms, so it breaks the hook budget unless it is opt-in and only on `Stop`.
- The hook input, including `last_assistant_message`, goes to the model. That is the same provider the session already uses, but it is still a new data path, so the privacy rule applies: an explicit setting, off by default.

**Not verified locally** (no model turn). Latency and plan cost are unmeasured.

### 7. OpenTelemetry to a local receiver

**Works, observed.** With the env vars above, Claude Code 2.1.295 posted OTLP/HTTP JSON to `http://127.0.0.1:4318/v1/metrics` and `/v1/logs` with no auth.

Seen locally (a run with no model turn):

| Kind | Names |
|---|---|
| Metrics | `claude_code.session.count` (`start_type`), `claude_code.active_time.total` (`type`) |
| Events | `claude_code.user_prompt` (`prompt` was `<REDACTED>`; `prompt_length` present), `hook_registered` (`hook_event`, `hook_type`, `hook_source`), `hook_execution_start`, `hook_execution_complete` (`num_hooks`, `num_success`, `num_blocking`, `num_non_blocking_error`, `num_cancelled`, `total_duration_ms`, …), `plugin_loaded`, `mcp_server_connection`, `managed_settings_resolved`, `api_error` |
| Resource | `host.arch`, `os.type`, `os.version`, `service.name`, `service.version` |
| Standard attributes | `session.id`, `prompt.id`, `event.sequence`, `user.id`, `user.email`, `user.account_uuid`, `user.account_id`, `organization.id`, `terminal.type` |

From docs (need a model turn): `claude_code.cost.usage`, `claude_code.token.usage`, `claude_code.lines_of_code.count`, `claude_code.commit.count`, `claude_code.pull_request.count`, `claude_code.code_edit_tool.decision`; events `assistant_response`, `tool_result` (`tool_name`, `success`, `duration_ms`), `tool_decision`, `api_request` (`cost_usd`, tokens, `duration_ms`), `permission_mode_changed`. Bash commands, file paths and tool inputs are redacted unless `OTEL_LOG_TOOL_DETAILS=1`; prompts unless `OTEL_LOG_USER_PROMPTS=1`. Default intervals: metrics 60 s, logs 5 s.

Things that matter for Vantage:

- **Repo settings can't turn it on.** Claude Code ignores `OTEL_*` in a repo's `.claude/settings.json` and `.claude/settings.local.json`. User settings `env` or the shell work for the CLI.
- **Code tab sessions.** The desktop docs say to set `CLAUDE_CODE_ENABLE_TELEMETRY` and `OTEL_*` "in the `env` block of your Claude Code managed settings" for Code tab sessions. Whether `~/.claude/settings.json` `env` is enough there was not tested.
- **Identity attributes** (`user.email`, account ids) arrive on every record. A Vantage receiver must drop them on ingest.
- **Useful as a source?** Yes as a supplement: tokens and cost per session and model, tool success and duration, and **hook latency measured by Claude Code itself** (`hook_execution_complete.total_duration_ms`), which is exactly what the hooks budget needs. Not as the spine: it is off by default, needs env setup, is batched (5–60 s), and redacts the commands and paths the proof gate needs.

### 8. Hook latency on Windows

Measured with PowerShell `Measure-Command`, 10 runs each:

| Process | Median | Max |
|---|---|---|
| `cmd /c exit 0` | 42 ms | 53 ms |
| `node -e 0` | 79 ms | 90 ms |
| Node script that reads stdin and appends one line | 97 ms | 115 ms |
| `cmd` appending stdin to a file | 58 ms | 71 ms |

A Node hook **is at the edge of the 100 ms budget on this machine before doing any work**. Telemetry from the headless run also showed the user's existing hooks: 6 `SessionStart` hooks took 2,362 ms together, 3 `UserPromptSubmit` hooks 2,511 ms. Hooks matching one event run in parallel.

Docs offer `"async": true` on command hooks: the hook runs in the background and doesn't block the session. That removes the latency question for spool-only hooks. It can't be used for a hook that must return a decision (the `Stop` gate).

## Implications

| Spec | Change |
|---|---|
| [Ingestion](../specs/ingestion.md) | Spool hooks run with `async: true`; the 100 ms rule applies to the sync `Stop` gate. Add `PostToolUseFailure` (failed commands), `PermissionRequest` (waiting on you, fast) and `SessionEnd`. Key on `session_id` and `prompt_id`, which also join OTel and the status line. |
| [Proof](../specs/proof.md) | Warn = exit 0 + `systemMessage`. Block = exit 2 with stderr, only when `stop_hook_active` is false. Never exit 1. |
| [Status line](../specs/status-line.md) | Set `refreshInterval` (for example 30 s), since an idle session doesn't refresh and the 5-minute stale rule would otherwise misfire. Use `COLUMNS` for truncation. Use `session_id` to find the current item. Must finish fast because a newer run cancels it. |
| [Operations](../specs/operations.md) | OTel receiver confirmed for the CLI; strip identity attributes; Code tab needs managed settings per docs. Use `hook_execution_complete` for hook latency metrics. |

Recorded as proposals P7–P9 in [DECISIONS](../DECISIONS.md#proposed-pending-confirmation) and questions Q28–Q29 in [OPEN-QUESTIONS](../OPEN-QUESTIONS.md).

## Follow-ups

- **Bean `vantage-2vdj`: rerun with a model turn.** Once the CLI on `PATH` (or the bundled one) is logged in, rerun this kit to observe `PostToolUse`, `PostToolUseFailure`, `Stop` (warn and exit 2), `Notification` for a permission prompt and for `AskUserQuestion`, `PreCompact`, the status line, a prompt hook's latency, and token and cost metrics.
- Check whether the Code tab shows a status line and whether `~/.claude/settings.json` `env` enables OTel there (Q29).
- Measure a compiled hook binary or a persistent helper against the 100 ms budget if `async` turns out not to fit (Q28).
