---
# vantage-j9ea
title: Carry the transcript branch on tool events
status: in-progress
type: task
priority: normal
created_at: 2026-10-14T23:17:12Z
updated_at: 2026-10-14T23:24:41Z
parent: vantage-fmfh
---

## Context

Blocked by: none. Measured in `docs/research/session-lineage.md`: 506 of 518 sessions are on a non-default branch by the transcript `gitBranch`, but `file.edited` and `command.ran` events from transcripts carry no `branch` (only prompts do), so the linker finds the branch only through a scanned worktree. Unverified on the live store whether this is why many sessions end as provisional items.

## Higher Goal

Fewer untitled Session rows: events anchor on their real branch (D54).

## Acceptance Criteria

- [ ] Measure on the live store how many provisional session items sit on a non-default transcript branch (counts only)
- [ ] If the cause is confirmed, tool events carry `branch` from the transcript line, with a replay test

## Out of Scope

- Derived-session grouping (`vantage-o3s3`)

## Summary of Changes

(filled in when done)
