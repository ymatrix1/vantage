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
