---
# vantage-0k45
title: Git scan scheduling loop applying the cadence
status: completed
type: task
priority: normal
created_at: 2026-10-14T17:42:17Z
updated_at: 2026-10-14T18:03:03Z
parent: vantage-fmfh
blocked_by:
    - vantage-3vuw
---


## Context
Split from vantage-in31. The scanner (createGitScanner) and cadence helper (scanIntervalMs) exist; nothing yet calls scan() on a schedule. Blocked by: vantage-3vuw (daemon process and store to host the loop and persist cursors).

## Higher Goal
Built and dirty state stay current without asking the agent.

## Acceptance Criteria
- [x] Daemon loop scans active worktrees every 30 s and others every 10 min via scanIntervalMs
- [x] Interval doubles on battery saver
- [x] Scan cursors (ScanState per worktree) persisted across daemon restarts
- [x] Emitted events handed to the ingest store, deduplicated by sourceId

## Out of Scope
GitHub PR data (Phase 4); git-hook fast path (vantage-3vuw).

## Summary of Changes
- `createGitLoop` (`packages/daemon/src/git-loop.ts`): one timer at the shortest cadence (30 s); each worktree is scanned only when due per `scanIntervalMs`, doubled while `batterySaver()` is true.
- Activity = a scan that produced events for a worktree with prior state; the first scan (backfill) does not count.
- Scan state persists per worktree as JSON in the `cursors` table (`git:<path>`), written with the events in one transaction through `insertEvent` (dedup by source, source_id).
- Scanner gained `scan(now, { due, onWorktree })`; Store gained `getCursorText`/`setCursorText`.
- `stop()` clears the timer and awaits an in-flight tick.
- Tests: `packages/daemon/test/git-loop.test.ts` (injected clock, fake timers, synthetic temp repos).
- Not done here: starting the loop from a daemon process (belongs to the daemon entry point).
