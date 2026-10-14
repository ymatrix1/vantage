---
# vantage-tizy
title: Live updates over WebSocket for the Track page
status: todo
type: task
created_at: 2026-10-14T19:11:01Z
updated_at: 2026-10-14T19:11:01Z
parent: vantage-fmfh
blocked_by:
    - vantage-olgf
---

## Context

`vantage-olgf` shipped the Track page polling `GET /api/track` every 5 s (D75, proposed). The web-ui spec defines `GET /api/live` (WebSocket) pushing `item.changed`, `flag.raised` and `source.health`, with updates visible within 2 s. Blocked by: none (olgf lands first).

## Higher Goal

The morning catch-up on the Track page feels live.

## Acceptance Criteria

- [ ] `GET /api/live` upgrades only with token, Host and Origin checks (D32); tests for each reject
- [ ] The Track page replaces polling with pushes and falls back to polling when the socket drops
- [ ] An update is visible within 2 s of the event reaching the daemon, measured

## Out of Scope

Write actions.
