---
# vantage-jieo
title: 'Stats: repo filter and derived sessions after schema changes'
status: todo
type: task
created_at: 2026-10-14T23:13:41Z
updated_at: 2026-10-14T23:13:41Z
parent: vantage-fmfh
blocked_by:
    - vantage-v1o3
---

## Context

D87 matches `--repo` on the event cwd and detects derived sessions by `parent_id` on `session:` items because `work_items.repo` is unset and session lineage has not landed. Blocked by: vantage-v1o3 and the session-lineage work.

## Higher Goal

Keep the numbers honest as the schema changes.

## Acceptance Criteria

- [ ] `--repo` uses `work_items.repo` once it is filled; derived-session share uses the lineage field
- [ ] Tests updated

## Out of Scope

New metrics.

## Summary of Changes

TBD
