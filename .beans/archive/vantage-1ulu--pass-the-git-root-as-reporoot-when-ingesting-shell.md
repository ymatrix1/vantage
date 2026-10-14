---
# vantage-1ulu
title: Pass the git root as repoRoot when ingesting shell writes
status: completed
type: task
priority: normal
created_at: 2026-10-14T18:34:40Z
updated_at: 2026-10-14T19:02:26Z
parent: vantage-fmfh
---

## Context

Blocked by: none. vantage-7ouh classifies shell write targets against the session cwd, or repoRoot when given. The daemon passes no repoRoot, so a session started in a subdirectory sees ../sibling writes as outside the repo and drops real edits.

## Higher Goal

Cards move only on evidence: in-repo edits must not be lost.

## Acceptance Criteria

- [x] Daemon resolves the repo root for a session cwd (longest known worktree root from the git scanner, no git call in the hook path) and passes it as repoRoot to toolCallEvents
- [x] Test: subdirectory cwd editing a sibling directory still yields file.edited

## Out of Scope

Symlink resolution.

## Summary of Changes

Added `resolveRepoRoot` (lexical, longest containing worktree root) in core and `knownRepoRoots` in the daemon ingest, which reads `worktree.scanned` events and passes `repoRoot` for spool and transcript ingest. Unknown roots fall back to the cwd (documented). Tests cover subdirectory and sibling writes, writes above the root, prefix-sharing siblings, Windows and POSIX paths and a spool end-to-end case. Proposed decision D77; ingestion spec updated.
