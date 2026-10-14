# Installing Vantage (instructions for AI agents)

> **Status:** planned; Vantage isn't released yet. This is the target for the first release.

This file is written for an AI coding agent (Claude Code, Codex or similar) that a user asked to install Vantage. Follow the steps in order and stop at any step that fails.

## The prompt users paste

```text
Install Vantage in this repo. Follow https://github.com/ymatrix1/vantage/blob/main/docs/install-for-agents.md exactly: show me the dry run first, wait for my OK, then install, verify with vantage doctor, and tell me what changed.
```

## Steps for the agent

1. **Check prerequisites.** Node.js 20 or newer (`node --version`) and git. If missing, tell the user what to install and stop.
2. **Dry run first.** Run `npx vantage add --dry-run` from the repo root. Show the user the full list of changes it would make (hooks, settings files, nothing inside the repo unless `--team`).
3. **Wait for the user's explicit OK.** Installing changes machine-level settings (Claude Code hooks, a global git hooks path). Don't continue without a clear yes.
4. **Install.** Run `npx vantage add`. Answer its questions with the user, not on their behalf (working hours, digest times, contexts).
5. **For Claude Code users, add the plugin** if it isn't present: `/plugin install vantage`. Codex users skip this step; Vantage reads Codex session files directly.
6. **Verify.** Run `vantage doctor`. Every check must pass. If one fails, show its message and the suggested fix, and ask before applying it.
7. **Report back** in a few lines: what was installed, where (file paths), how to open the UI (`vantage open`), and how to undo it (`vantage remove` for this repo, `vantage uninstall` for everything).

## Rules

- **Never** add tokens, API keys or credentials. Remote sources (GitHub beyond `gh`, Slack, Jira, Linear, monitoring) are connected later by the user from the Sources page.
- **Never** commit anything. Only `--team` writes a repo file, and only if the user asks for it.
- **Never** run `vantage uninstall` or delete `~/.vantage/` unless the user asks.
- If anything is unclear, ask the user instead of guessing.
