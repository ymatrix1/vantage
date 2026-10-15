# Spec: identity, config and operations

The plumbing that the other specs assume.

## Identity

Vantage needs to know who "you" are in every system, and who other people are, to detect mentions, commitments and "someone is blocked on you".

- **Me:** one record holding the user's ids per source: GitHub login, Slack user id, Jira account id, Linear user id, git author emails. Filled during setup, verified by an API call to each source.
- **People:** one record per teammate, merging their ids across sources by email when available, otherwise by manual linking in the UI. Used for "blocked on you" and grouping mentions by person.

## Configuration

A single file, `~/.vantage/config.toml` (*tentative*):

- **Repos:** paths to watch (worktrees are found automatically), default branch, and per-repo settings:
  - deploy signal (GitHub deployments, an Actions workflow name, or none),
  - post-deploy checks and monitoring service names,
  - monitoring window (default 2 days),
  - proof commands to add to the default list.
- **Sources:** which ones are enabled.
- **Calm settings:** digest times (default 10:00 and 14:00), quiet hours, `forgotten` threshold (default 5 days), Focus size (default 3).
- **Flag window:** `flag_window_hours = 48`: `thrashing` and `unproven_claim` are raised only for items active within this many hours (whole number, 1 to 8760; proposed D84). Older items keep their stage and proof state.
- **Request titles:** `item_titles_from_requests = true | false`, default `true` (proposed D95). When on, the first sentence of a session's first request, cleaned and capped at 80 characters, titles that session's provisional item, stored only in the local database. `false` stops capture and falls back to the repo, branch and date title. Read when the daemon starts. `vantage titles` lists what is stored and `vantage titles clear` deletes it.
- **Classifier (opt-in, D100):** `[engines.classify]` with `enabled`, `model`, `batch_size`, `daily_calls`, `auto_accept` and the rest, plus `data_policy.outside_calls` and `data_policy.allow.transcripts`. Off by default; see [settings](settings.md#classify) and [classify](classify.md). `vantage classify --dry-run` shows exactly what a run would send and calls nothing.
- **Proof gate mode:** `proof_gate = "off" | "warn" | "block"`, default `warn`; `VANTAGE_GATE_MODE` overrides it (D73). `block` is not wired yet.
- **Engines, budgets and data policy:** which engine answers each AI-assisted job, daily limits, and which kinds of content an outside engine may receive. All outside calls are off by default (see [settings](settings.md)).

`vantage init` writes the config, installs the Claude Code hooks and git hooks, and runs a first backfill.

## Secrets

- Tokens (GitHub, Slack, Jira, Linear, monitoring) are stored in the OS credential store (Windows Credential Manager, macOS Keychain), never in the config file or the database.
- Prefer reusing existing logins where possible, for example the `gh` CLI's token.
- Least scope: read-only scopes unless a write action is enabled.

## "Seen" state

"Unseen mention" needs a definition per source, because not all APIs expose read state:

| Source | Seen when |
|---|---|
| GitHub | Notification `unread = false`, or the user replied or reacted |
| Linear | Notification `readAt` set, or the user replied |
| Slack | The user replied in the thread or reacted (Slack's API doesn't expose per-message read state) |
| Jira | The user commented after the mention, or transitioned the issue |
| Any | The user marked it done in Vantage |

## Daemon lifecycle

- Starts at login (Windows Task Scheduler or a startup entry; launchd on macOS).
- On start: run `catchUp` for every source from its cursor, then start push listeners.
- On sleep or resume: catch up again.
- If the daemon is down, hooks still append to the spool; nothing is lost.
- A single instance per machine. Multi-machine sync is out of scope.

Phase 1 runtime ([D78](../DECISIONS.md#d78-phase-1-daemon-runtime-one-process-lock-and-health-files-vantage-start-and-vantage-open), proposed): `vantage start` runs ingest, the git loop, the stage loop (writing `$VANTAGE_HOME/status.json`) and the HTTP server in one process. `daemon.lock` enforces one instance; `health.json` reports pid, port, last ingest and last stage pass for `vantage open` and `vantage doctor`. `vantage open` prints and opens the fragment URL (`--print` only prints). Environment: `VANTAGE_HOME`, `VANTAGE_PORT` (default 4317), `VANTAGE_REPOS`, `VANTAGE_PROJECTS_DIR`, `VANTAGE_UI_DIR`.

## Hooks performance budget

- Claude Code and git hooks must finish in under 100 ms and exit 0 in warn mode, whatever happens.
- They do one thing: append a JSON line to the spool file. Claude Code spool hooks use `async: true`, so they don't block the session (D59).
- Measured 2026-10-14 on Windows 11: a Node process alone takes about 80 ms and a Node append hook about 97 ms median, so a synchronous Node hook has no headroom (research [R2](../research/claude-code-hooks.md#8-hook-latency-on-windows), Q28).
- The proof gate in `block` mode is the only hook that may return a non-zero exit code, and only from the `Stop` hook.

## Source health

- Each source shows last successful sync, last error and rate-limit headroom.
- When a source is stale beyond 3 polling intervals, the UI says so on the affected cards ("GitHub not synced for 20 min").

## Notifications

- Windows toast notifications (or macOS Notification Center) for red items only.
- Respect quiet hours; queue toasts for after.
- Each toast has one action, which opens the item.

## Storage and retention

- SQLite in `~/.vantage/`.
- Events kept for 180 days by default; work items kept indefinitely; raw transcript excerpts capped in size.
- `vantage export` and `vantage reset` commands.

## Quality: how we know it works

- **Fixtures:** recorded real `.jsonl` transcripts, git histories and API responses, with secrets scrubbed, replayed through the pipeline in tests.
- **Linker accuracy:** a small labeled set of "this event belongs to this item"; track precision before and after changes.
- **Flag precision:** for each flag, track how often the user dismisses it as wrong. A flag above 30% dismissals gets fixed or turned off.
- **Usage metrics:** local-only counters for the PRD success metrics (daily opens, morning catch-up time).
- **`vantage stats`** (Phase 1, [D88](../DECISIONS.md#d88-vantage-stats-aggregates-only-read-only-goals-as-starting-points-proposed), proposed): the measurement for "is the Track page usable?". It opens `vantage.db` read-only and prints aggregates only: items total and active in 24 h, 7 d and 30 d; readable-title share (a provisional session item, titled only `Session xxxxxxxx` or `repo · branch · date`, is untitled); anchor kinds; *Needs you* (items with an open, undismissed flag) in total and with activity in the last 48 h, and split by flag kind (`forgotten`, `thrashing`, `unproven_claim`; `forgotten` is being moved out of Needs you in the API); lineage numbers from the `item_sessions` view (D86), shown only when sessions exist: the share of sessions on an issue, branch or worktree item rather than a provisional per-session item (goal at least 70%), the share of sessions on a non-default branch counting only the stored event and also the branch recorded from the transcript (D92), so the effect of that fix shows, sessions total, median and maximum sessions per item, items with more than one session, derived sessions and sub-agent runs; stages; the share of items with a code edit (docs-only excluded) that reached Proven (goal at least 50%) and the Built items whose proof expired, failed or was weak; the checks that ran, counted by the stage machine's own runner families (`vitest`, `jest`, `pytest`, `go_test`, `dotnet_test`, `dbt`, `cargo_test`, other test runner, data tool) and one number for commands not recognised as checks, never their text, to tune proof detection; events by source; database size; the age of the last stage pass (`max(work_items.updated_at)`, D75). `--since`, `--repo NAME` (a path segment of the event's `cwd` or repo root, case-insensitive), `--json`, and `--days N` for a per-day table of active items, new items, titled items, events, flags raised and items that reached Proven. Output holds numbers and fixed labels only, so it can be pasted into an issue. Goals (Needs you under 10, readable titles at least 80%, Built with no fresh proof at most 30%, stage pass within 5 minutes, database within the 500 MB budget) are starting points; a symbol shows where a number stands against them.

## Edge cases

| Case | Handling |
|---|---|
| Worktree deleted | Item keeps its history; the worktree anchor is marked gone. Uncommitted work lost is flagged once. |
| Repo moved or renamed | Matched by remote URL and first commit id, not path. |
| Branch renamed | Re-anchors the item (D25 rule 6). |
| Squash merge or rebase | Merges matched by PR number and head branch, not commit id. |
| Force push | Proof fingerprints still decide freshness; history keeps old events. |
| Clock and time zones | Stored in UTC; "since yesterday" and digest times use local time and the user's working hours. |

## Upgrades, backup and uninstall

- Schema migrations run at daemon start after an automatic backup of the database (keep the last 5).
- `vantage export` writes events and user actions; `vantage import` restores them.
- `vantage uninstall` removes Claude Code and git hooks, restores any chained repo hooks, and asks before deleting `~/.vantage/`. Phase 1 (D79): it strips only entries carrying the `--vantage-managed` marker, unsets `core.hooksPath` only if it is still Vantage's, deletes only marked wrappers, keeps edits made after `add`, and never deletes `~/.vantage/`; a copy of the settings from before `add` stays in `~/.vantage/backups/`. `vantage remove` unregisters one repo only.
- `vantage doctor` prints one PASS, WARN or FAIL line per check (hooks registered and their files exist, status line, spool writable, daemon health fresh, database opens read-only, status file fresh, repos and transcripts) with one fix hint per problem. It exits non-zero only on FAIL, meaning capture is broken. A daemon that is not running is a WARN, because hooks still write to the spool.

## Accessibility and keyboard

- Every action has a keyboard shortcut; a command palette lists them.
- Meaning is never color-only: dots also differ by shape or fill (filled, ring, dashed, hollow).
- Focus states are visible in every theme.

## Resource budget

Vantage runs all day on a work laptop, so it must stay invisible.

| Resource | Budget |
|---|---|
| CPU, idle | Under 1% on average |
| CPU, backfill or replay | Under 25% of one core, throttled, at low process priority |
| Memory | Under 200 MB for the daemon |
| Disk | Database under 500 MB in typical use; retention trims events older than 180 days |
| Network | Only the polling budgets in [ingestion](ingestion.md#polling-budget); no remote telemetry |
| Battery | Polling intervals double on battery saver |
| Status line | Reads the summary file in under 10 ms |
| Hooks | Under 100 ms (D21) |

Budgets are checked in Phase 1 with a one-week measurement on the user's machine, and a CI test for the hooks and status line.

## Local telemetry and diagnostics

Telemetry is **local only**: it never leaves the machine unless the user exports it.

| Signal | What | Where |
|---|---|---|
| **Structured logs** | JSON lines per component (ingest, linker, scorers, server, hooks), with levels and a correlation id per event | `~/.vantage/logs/`, rotated daily, 14 days kept |
| **Metrics** | Counters and timings: hook latency, spool lag, ingest lag per source, poll durations and errors, rate-limit headroom, linker decisions by method, flag raises and dismissals, Explain latency and validity, CPU, memory, database size | Local metrics table, sampled every minute, 30 days kept |
| **Traces** | One trace per event through the pipeline: received → linked (which anchor or rule) → stage or flag change | Kept with the event, so any card can answer "why did this move?" |

**Using it**

- **Sources page, Diagnostics tab:** health per source, the budget table from this spec with current values, recent errors.
- **"Why did this change?"** on any card shows the trace: the event, the rule that fired and the resulting change.
- **`vantage doctor`** checks hooks, spool, daemon, database, tokens and source access, and prints fixes.
- **`vantage debug-bundle`** writes a zip of logs, metrics and config with ids, names, URLs and message text scrubbed (same rules as fixtures), for the user to inspect or share by choice.
- **Debug level** can be raised per component at runtime (`vantage log-level linker debug`), and drops back after an hour.

**Optional: Claude Code's own telemetry** (D61). Claude Code exports OpenTelemetry over OTLP/HTTP JSON to a local receiver on `127.0.0.1:4318` (verified with 2.1.295 in research [R2](../research/claude-code-hooks.md#7-opentelemetry-to-a-local-receiver)). Vantage uses it as a supplement, never as the spine: token and cost per session and model, tool success and duration, and Claude Code's own hook timings (`claude_code.hook_execution_complete`). Setup:

- Off by default; `vantage init` offers it and writes `CLAUDE_CODE_ENABLE_TELEMETRY` and `OTEL_*` to the user settings `env` (repo settings are ignored for `OTEL_*`). Code tab sessions may need managed settings (Q29).
- The receiver binds to `127.0.0.1` only and drops identity attributes (`user.email`, `user.account_uuid`, `user.account_id`, `organization.id`) on ingest.
- Prompt, command and path redaction stays at Claude Code's defaults.
