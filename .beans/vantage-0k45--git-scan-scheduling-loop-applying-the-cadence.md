---
# vantage-0k45
title: Git scan scheduling loop applying the cadence
status: todo
type: task
created_at: 2026-10-14T17:42:17Z
updated_at: 2026-10-14T17:42:17Z
parent: vantage-fmfh
blocked_by:
    - vantage-3vuw
---

## Context
Split from vantage-in31. The scanner (createGitScanner) and cadence helper (scanIntervalMs) exist; nothing yet calls scan() on a schedule. Blocked by: vantage-3vuw (daemon process and store to host the loop and persist cursors).

## Higher Goal
Built and dirty state stay current without asking the agent.

## Acceptance Criteria
- [ ] Daemon loop scans active worktrees every 30 s and others every 10 min via scanIntervalMs
- [ ] Interval doubles on battery saver
- [ ] Scan cursors (ScanState per worktree) persisted across daemon restarts
- [ ] Emitted events handed to the ingest store, deduplicated by sourceId

## Out of Scope
GitHub PR data (Phase 4); git-hook fast path (vantage-3vuw).

## Summary of Changes
TBD
