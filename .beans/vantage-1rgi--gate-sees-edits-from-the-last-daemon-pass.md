---
# vantage-1rgi
title: Gate sees edits from the last daemon pass
status: draft
type: task
created_at: 2026-10-14T19:09:37Z
updated_at: 2026-10-14T19:09:37Z
parent: vantage-fmfh
blocked_by:
    - vantage-8nb2
---

## Context

The Stop gate reads derived tables, so a check or edit within the last 30 seconds may be missing (D72 Impact). Measure how often this gives a wrong warning, then decide whether the hook should ask for a pass first. Blocked by: vantage-8nb2.

## Higher Goal

Keep the gate's warnings trustworthy (D53).

## Acceptance Criteria

- [ ] Measured rate of lag-caused wrong warnings
- [ ] A decision on running a pass from the hook

## Out of Scope

Block mode.
