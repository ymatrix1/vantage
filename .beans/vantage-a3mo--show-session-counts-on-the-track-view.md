---
# vantage-a3mo
title: Show session counts on the Track view
status: todo
type: task
created_at: 2026-10-14T23:17:12Z
updated_at: 2026-10-14T23:17:12Z
parent: vantage-fmfh
---

## Context

Blocked by: the Track API work (track.ts, api.ts) landing. `vantage-o3s3` exposes per-item `session_count`, `derived_count` and `subagent_count` through the `item_sessions` view and `itemSessionCounts(store)` in the daemon (D86).

## Higher Goal

One card per piece of work, with the number of sessions behind it visible.

## Acceptance Criteria

- [ ] The Track API returns `sessionCount`, `derivedCount`, `subagentCount` per item from `itemSessionCounts`
- [ ] The Track row shows them (for example "3 sessions, 1 resumed, 2 sub-agents")

## Out of Scope

- Heuristic grouping (D87)

## Summary of Changes

(filled in when done)
