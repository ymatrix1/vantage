---
# vantage-v3sw
title: Start the stage loop with statusFile in the running daemon
status: completed
type: task
priority: normal
created_at: 2026-10-14T19:09:02Z
updated_at: 2026-10-14T19:52:37Z
parent: vantage-fmfh
---

## Context

The status line (vantage-p9at) reads ~/.vantage/status.json. createStageLoop({statusFile}) writes it, but no long-running daemon process starts the loop yet. Blocked by: none (needs the daemon entry the Track page session adds, or a small one).

## Higher Goal

The status line shows live data without manual steps.

## Acceptance Criteria

- [x] The daemon process starts createStageLoop with statusFile = $VANTAGE_HOME/status.json
- [x] An end-to-end test: spool events in, status.json out, status line command prints the item

## Out of Scope

Installing the statusLine setting (vantage-p9x2).

## Summary of Changes

- `vantage start` runs `createStageLoop` with `statusFile = $VANTAGE_HOME/status.json` (see `vantage-6bni` and D78).
- End-to-end test in `packages/cli/test/daemon.test.ts`: spool events in, `status.json` out, the status line command prints the item.
