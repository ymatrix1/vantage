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
- **Proof gate mode:** `off`, `warn` (default) or `block`.

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

## Hooks performance budget

- Claude Code and git hooks must finish in under 100 ms and exit 0 in warn mode, whatever happens.
- They do one thing: append a JSON line to the spool file.
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
