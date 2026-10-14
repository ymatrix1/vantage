---
# vantage-ijmb
title: Installer registers the native hook and doctor reports it
status: todo
type: task
created_at: 2026-10-14T19:26:53Z
updated_at: 2026-10-14T19:26:53Z
parent: vantage-fmfh
blocked_by:
    - vantage-bfr1
---

## Context

Split from vantage-bfr1 (the installer box). Blocked by: vantage-bfr1. D72 and D76: the installer resolves the per-OS package binary, registers `<binary> <abs path to packages/hooks/dist/src/bin.js>`, falls back to `node dist/src/bin.js` when no native package resolves, and `vantage doctor` reports which is registered. Part of vantage-p9x2's scope.

## Higher Goal

Never slow an agent down.

## Acceptance Criteria

- [ ] Installer resolves the native binary path and registers it with the Node entry as first argument
- [ ] Falls back to node dist/src/bin.js when none resolves
- [ ] vantage doctor reports which is registered

## Out of Scope

Building or publishing the packages (vantage-bfr1).
