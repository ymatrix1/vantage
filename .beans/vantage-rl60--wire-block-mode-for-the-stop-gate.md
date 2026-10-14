---
# vantage-rl60
title: Wire block mode for the Stop gate
status: draft
type: task
created_at: 2026-10-14T19:09:37Z
updated_at: 2026-10-14T19:09:37Z
parent: vantage-fmfh
blocked_by:
    - vantage-8nb2
---

## Context

The Stop gate (vantage-8nb2, D72) parses mode block but renders it as warn. D60: exit 2 with the message on stderr, only when stop_hook_active is false. Blocked by: vantage-8nb2, and the policy answer to Q11.

## Higher Goal

Let the user opt into a hard stop on unproven claims.

## Acceptance Criteria

- [ ] Block mode exits 2 with the message on stderr when stop_hook_active is false
- [ ] A loop-safety test shows the second Stop is not blocked
- [ ] Observed in real Claude Code (vantage-2vdj)

## Out of Scope

Making block the default (Q11).
