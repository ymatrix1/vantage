---
# vantage-e0rt
title: Track items carry sessionCount and derivedCount
status: completed
type: task
created_at: 2026-10-14T23:41:44Z
updated_at: 2026-10-14T23:41:44Z
parent: vantage-fmfh
---

## Context

Blocked by: none (#49 and #52 are merged). #49 added `itemSessionCounts` (sessions, derived sessions, sub-agents per item) but the Track response does not carry them.

## Higher Goal

The Track page can show "N sessions" and fold derived ones.

## Acceptance Criteria

- [x] Each Track item carries `sessionCount` (default 1) and `derivedCount` (default 0), read from `item_sessions` for the page's rows only.
- [x] Tests for an item with derived sessions and one with none; docs updated.

## Out of Scope

A session-count facet (it needs a scan of every item's links on each request); UI changes.

## Summary of Changes

`sessionCount` and `derivedCount` on each Track item from `itemSessionCounts` (page rows only, defaults 1 and 0); no facet, because it needs a scan of every item's links on each request. Tested with two sessions, one derived, and an item with no linked session.
