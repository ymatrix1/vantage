---
# vantage-1ulu
title: Pass the git root as repoRoot when ingesting shell writes
status: todo
type: task
created_at: 2026-10-14T18:34:40Z
updated_at: 2026-10-14T18:34:40Z
parent: vantage-fmfh
---

## Context

Blocked by: none. vantage-7ouh classifies shell write targets against the session cwd, or repoRoot when given. The daemon passes no repoRoot, so a session started in a subdirectory sees ../sibling writes as outside the repo and drops real edits.

## Higher Goal

Cards move only on evidence: in-repo edits must not be lost.

## Acceptance Criteria

- [ ] Daemon resolves the git toplevel for a session cwd (cached) and passes it as repoRoot to toolCallEvents
- [ ] Test: subdirectory cwd editing a sibling directory still yields file.edited

## Out of Scope

Symlink resolution.
