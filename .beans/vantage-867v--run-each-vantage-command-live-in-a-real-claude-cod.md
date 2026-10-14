---
# vantage-867v
title: Run each /vantage command live in a real Claude Code session
status: todo
type: task
created_at: 2026-10-14T22:28:48Z
updated_at: 2026-10-14T22:28:48Z
parent: vantage-fmfh
blocked_by:
    - vantage-u902
---

## Context

The plugin `plugin/vantage` (vantage-u902) is checked for structure and with `claude plugin validate` only. Running it touches the real Claude config, so the user does it. Blocked by: vantage-u902 merge.

## Higher Goal

The daily loop is one keystroke.

## Acceptance Criteria

- [ ] `claude plugin install vantage@vantage`, new session: `/vantage:open`, `:start`, `:doctor`, `:status`, `:add` each run
- [ ] allowed-tools patterns (`Bash(vantage open*)`, `node *...main.js open*`) pre-approve as intended on Windows
- [ ] `/vantage:add` stops for a yes and then runs `--yes`
- [ ] Decide on a bare `/vantage` form (skill) if wanted

## Out of Scope

New CLI features.

## Summary of Changes

(when done)
