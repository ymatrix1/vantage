---
# vantage-36d3
title: Stats goals configurable in config.toml
status: todo
type: task
created_at: 2026-10-14T23:13:40Z
updated_at: 2026-10-14T23:13:40Z
parent: vantage-fmfh
blocked_by:
    - vantage-v1o3
---

## Context

`vantage stats` (vantage-v1o3, D88) keeps its goals (Needs you under 10, readable titles at least 80%, ...) as constants. The user may want to change them. Blocked by: vantage-v1o3.

## Higher Goal

Let the user judge the Phase 1 exit against their own bar.

## Acceptance Criteria

- [ ] Goals read from a `[stats]` table in `config.toml`, with the current values as defaults
- [ ] Test with a temp VANTAGE_HOME

## Out of Scope

New metrics.

## Summary of Changes

TBD
