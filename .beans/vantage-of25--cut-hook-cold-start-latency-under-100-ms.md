---
# vantage-of25
title: Cut hook cold-start latency under 100 ms
status: todo
type: task
priority: low
created_at: 2026-10-14T17:17:14Z
updated_at: 2026-10-14T17:17:14Z
parent: vantage-fmfh
blocked_by:
    - vantage-3vuw
---

## Context
Blocked by: none (vantage-3vuw is merged with PR #10). A cold node start measured about 215 ms on the dev laptop, above the 100 ms hook budget (ingestion principle 3). Hooks are async (D59), so the agent is not blocked; the cost is a short-lived process per hook.

## Higher Goal
Never slow an agent down.

## Acceptance Criteria
- [ ] Measure cold-start of node bin.ts against a leaner launcher (compiled binary or socket write to the daemon), 10 runs each, same setup
- [ ] Pick one, record the numbers and the decision (D-entry)
- [ ] Hook test asserts the chosen launcher exits 0 with the daemon down

## Out of Scope
Changing which events are collected.

## Summary of Changes
TBD
