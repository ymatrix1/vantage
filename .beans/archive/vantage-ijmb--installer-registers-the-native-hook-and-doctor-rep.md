---
# vantage-ijmb
title: Installer registers the native hook and doctor reports it
status: completed
type: task
priority: normal
created_at: 2026-10-14T19:26:53Z
updated_at: 2026-10-14T22:14:53Z
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
- [x] vantage doctor reports which is registered

## Out of Scope

Building or publishing the packages (vantage-bfr1).

## Summary of Changes

- `resolveHookCommands` (packages/cli/src/install.ts) picks the per-OS package binary, then `packages/hooks-native/target/release/vantage-hook`, then `node bin.js`; native registers `"<binary>" "<bin.js>" --vantage-managed`. New `findNativeBinary`; env overrides `VANTAGE_NATIVE_PACKAGES_DIR` and `VANTAGE_NATIVE_BUILD_DIR` keep tests hermetic.
- `vantage add --dry-run` prints `Hook: <choice and why>`.
- `vantage doctor` reports native or node, checks the binary and the Node entry exist, and warns (fix: `vantage add --yes`) when Node is registered while a native binary is available.
- D80 proposed; ROADMAP, first-run.md and ingestion.md updated. 17 new tests in packages/cli/test/install.test.ts.
