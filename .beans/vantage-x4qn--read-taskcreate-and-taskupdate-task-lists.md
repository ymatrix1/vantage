---
# vantage-x4qn
title: Read TaskCreate and TaskUpdate task lists
status: todo
type: task
created_at: 2026-10-15T00:06:43Z
updated_at: 2026-10-15T00:06:43Z
parent: vantage-fmfh
---

## Context

The newer task tools appear in 3 of 521 sessions (5 creates, 8 updates). A TaskUpdate names a taskId that the TaskCreate result carries; its shape was not verified. Blocked by: `vantage-udzy` merged.

## Higher Goal

Cover the task tools if they replace TodoWrite.

## Acceptance Criteria

- [ ] Verify the TaskCreate result shape on real data (aggregates only)
- [ ] Replay create and update calls into `task.list.updated` counts

## Out of Scope

- TodoWrite (done)

## Summary of Changes

(filled in when done)
