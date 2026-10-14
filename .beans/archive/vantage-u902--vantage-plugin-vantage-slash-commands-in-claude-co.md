---
# vantage-u902
title: 'Vantage plugin: /vantage slash commands in Claude Code'
status: completed
type: feature
priority: normal
created_at: 2026-10-14T22:24:55Z
updated_at: 2026-10-14T22:28:24Z
parent: vantage-fmfh
---

## Context

Phase 1 ships the CLI (`vantage start`, `open`, `add`, `remove`, `uninstall`, `doctor`). The first-run spec plans `/plugin install vantage`, then `/vantage add`, and the daily loop should be one keystroke inside Claude Code. The repo's marketplace (named `vantage`) only lists the `a2v` plugin.

Blocked by: none.

## Higher Goal

Make the daily loop (open, start, check health, see the current item, add a repo) one slash command, while every machine change stays behind the CLI's own dry run and confirmation (D79).

## Acceptance Criteria

- [x] Plugin `plugin/vantage` with `plugin.json`, one command file per `open`, `start`, `doctor`, `status`, `add`, and a README
- [x] Marketplace entry `vantage` with source `./plugin/vantage`
- [x] Each command runs exactly one CLI call, with `allowed-tools` limited to the Bash commands it needs
- [x] `add` runs `--dry-run`, waits for an explicit yes in chat, then `--yes`
- [x] No command runs `uninstall` or `remove`, edits settings by hand or prints the token outside the CLI's URL
- [x] A check (unit test) validates frontmatter, description, restricted allowed-tools, and plugin.json and marketplace agreement
- [x] README, first-run spec and ROADMAP updated; any open decision recorded as proposed
- [x] Live run in a real session moved to follow-up bean `vantage-867v` (touches the user's real config)

## Out of Scope

- New daemon or CLI features; Codex support; uninstall or remove commands

## Summary of Changes

- Plugin `plugin/vantage`: `plugin.json`, five `commands/*.md` (`/vantage:open`, `:start`, `:doctor`, `:status`, `:add`), README; marketplace entry `vantage` -> `./plugin/vantage`.
- Form: Claude Code docs give `/<plugin>:<command>`; a bare `/vantage open` is undocumented for plugins, so not offered (D83 proposed).
- `add` pre-approves only `--dry-run`; `--yes` needs a chat yes and Claude Code's own prompt. All commands are `disable-model-invocation`.
- `tools/plugin_check.py` (+ `test_plugin_check.py`, wired into `check_docs.py`): frontmatter, description, restricted allowed-tools, no uninstall/remove, YAML-quoting hazards, plugin.json and marketplace agreement. `claude plugin validate` found two real YAML errors, now fixed.
- README, first-run spec, ROADMAP updated.
