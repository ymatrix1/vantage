---
# vantage-kbr6
title: Trigger a stage pass when events arrive so live updates land within 2 s of the event
status: todo
type: task
priority: normal
created_at: 2026-10-14T22:24:53Z
updated_at: 2026-10-14T22:24:53Z
parent: vantage-fmfh
blocked_by:
    - vantage-tizy
---

## Context

Blocked by: vantage-tizy (live socket). The stage pass runs every 30 s (STAGE_PASS_MS), so a push reaches the page within ms of the pass but up to 30 s after the event reaches the daemon. docs/specs/web-ui.md wants live updates within 2 s of the event.

## Higher Goal

The morning catch-up on the Track page feels live.

## Acceptance Criteria

- [ ] A stage pass runs within about 1 s after ingest inserts events (debounced), so the page shows the change within 2 s of the event reaching the daemon
- [ ] Measured end to end: spool line written, then page-visible time, on an ephemeral port
- [ ] Passes stay bounded under a burst (no more than one per debounce window; the 30 s timer remains)

## Out of Scope

Write actions; a different push transport.
