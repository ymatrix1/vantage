---
# vantage-jieo
title: 'Stats: repo filter after schema changes'
status: todo
type: task
created_at: 2026-10-14T23:13:41Z
updated_at: 2026-10-14T23:13:41Z
parent: vantage-fmfh
blocked_by:
    - vantage-v1o3
---

## Context

D88 matches `--repo` on the event cwd because `work_items.repo` is unset. Blocked by: vantage-v1o3.

## Higher Goal

Keep the numbers honest as the schema changes.

## Acceptance Criteria

- [ ] `--repo` uses `work_items.repo` once it is filled
- [ ] Tests updated

## Out of Scope

New metrics.

## Summary of Changes

TBD
