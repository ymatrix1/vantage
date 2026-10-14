# Spec: first run

> **Status:** draft.

The first ten minutes decide whether Vantage gets used. This spec covers install to first useful view.

## `vantage init`

Run once, from any repo:

1. **Detect** agents and sources available on this machine: Claude Code transcripts, Codex sessions, `gh` login, git repos and worktrees. Show what was found.
2. **Choose repos** to watch (default: repos with agent sessions in the last 30 days). Suggest Work and Personal contexts from GitHub orgs and paths (Q16).
3. **Install hooks** (Claude Code, git), showing exactly which files change. Uninstall is one command.
4. **Ask for working hours and digest times** (defaults shown, Enter to accept).
5. **Backfill** the last 14 days in the background, with a progress line. The UI opens before backfill ends.
6. **Open the UI** with a local token in the URL fragment (D32).

Nothing is sent anywhere during init. Remote sources (Slack, Jira, Linear, monitoring) are offered later, one at a time, from the Sources page.

## Adding an existing repo

One command from inside any repo, existing work included:

```bash
npx vantage add
```

Or from inside Claude Code: `/plugin install vantage`, then `/vantage add`.

What it does, in under a minute:

1. **Starts Vantage** if it isn't running (installs it the first time, then runs the `vantage init` questions once per machine).
2. **Registers the repo** and finds its worktrees automatically.
3. **Hooks are installed once per machine, not per repo:** Claude Code hooks at the user level and git hooks through a global `core.hooksPath` that chains the repo's own hooks (Husky, Lefthook, plain `.git/hooks`). Existing hooks keep working.
4. **Backfills this repo's history:** agent sessions whose working directory is the repo or one of its worktrees, plus git history, for the last 14 days.
5. **Opens the landscape** filtered to this repo.

Guarantees:

- **Nothing in the repo changes by default.** No files written, nothing committed.
- `--dry-run` prints every change before making it.
- `--team` (opt-in) writes a small `.vantage/project.toml` with shared settings (project name, deploy signal, proof commands, monitoring service names) that teammates can commit.
- `vantage remove` unregisters the repo; `vantage uninstall` removes everything (see [operations](operations.md#upgrades-backup-and-uninstall)).

## First view

- **Backfill running:** the landscape fills in as items are found, with a quiet "reading the last 14 days" line.
- **Nothing found:** an invitation, not an apology: "Start a Claude Code session in one of your repos and it will appear here."
- **Items found:** the normal landscape, plus the one-time legend below.

## One-time legend

A short overlay, shown once and reachable later with `?`:

1. "Each dot is a piece of work." (points at a dot)
2. "The ring is its six steps, from asked to verified." (animates one ring)
3. "Close means it needs you; the sky is what you finished." (points at the bands)
4. "Press `e` on anything for an explanation."

Four steps, one sentence each, skippable.

## Sample mode

`vantage demo` opens the UI on synthetic data (the mockup data set) without touching real logs, for trying the UI or showing it to someone.

## Success check

Within 10 minutes of `vantage init`, the user sees at least one real item on the landscape with a correct stage.
