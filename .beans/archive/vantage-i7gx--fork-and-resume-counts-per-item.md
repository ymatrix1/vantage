---
# vantage-i7gx
title: Fork and resume counts per item
status: completed
type: task
created_at: 2026-10-15T00:06:42Z
updated_at: 2026-10-15T00:06:42Z
parent: vantage-fmfh
---

## Context

79 of 521 sessions are derived; 59 of 75 with a parent transcript started while the parent was still active, but the hook source is not in the data yet. Blocked by: none.

## Higher Goal

Say fork or resume only where the data says so, and keep timing as a hint.

## Acceptance Criteria

- [x] Measure forks, resumes and continuations in the data
- [x] `forkCount` and `resumeCount` from the `SessionStart` source only
- [x] `forkHintCount` from timing, never used as a rule
- [x] Tests: hook source fork, resume, none; timing alone

## Out of Scope

- Changing the grouping rule (D86)

## Summary of Changes

- `item_sessions` gains `fork_count`, `resume_count`, `fork_hint_count`; `itemSessionCounts` returns `forkCount`, `resumeCount`, `forkHintCount`.
- Proposed D97; work-item-model, research, ROADMAP.
