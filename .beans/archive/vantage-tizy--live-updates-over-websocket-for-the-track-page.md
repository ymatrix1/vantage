---
# vantage-tizy
title: Live updates over WebSocket for the Track page
status: completed
type: task
priority: normal
created_at: 2026-10-14T19:11:01Z
updated_at: 2026-10-14T22:25:17Z
parent: vantage-fmfh
blocked_by:
    - vantage-olgf
---

## Context

`vantage-olgf` shipped the Track page polling `GET /api/track` every 5 s (D75, proposed). The web-ui spec defines `GET /api/live` (WebSocket) pushing `item.changed`, `flag.raised` and `source.health`, with updates visible within 2 s. Blocked by: none (olgf lands first).

## Higher Goal

The morning catch-up on the Track page feels live.

## Acceptance Criteria

- [x] `GET /api/live` upgrades only with token, Host and Origin checks (D32); tests for each reject
- [x] The Track page replaces polling with pushes and falls back to polling when the socket drops
- [x] An update is visible in the page within 2 s of the stage pass producing it, measured (3.8 ms pass to client message on loopback; test with a real clock)
- [ ] Within 2 s of the event reaching the daemon: split out to vantage-kbr6, because the stage pass runs every 30 s

## Out of Scope

Write actions.

## Summary of Changes

- `packages/daemon/src/live.ts`: dependency-free send-only WebSocket hub (handshake, framing, ping, cap of 8, backpressure drop) and the Track-view diff that makes `item.changed`, `flag.raised`, `source.health` and `resync`.
- `packages/daemon/src/http.ts`: `upgrade` handler with the same checks in the same order as every route (method, Host, Origin, token), all before the 101; token in `Sec-WebSocket-Protocol`. Host and Origin checks shared with the request path.
- `stage-loop.ts` gains `onPass`; `runtime.ts` publishes after every pass.
- `packages/ui/src/lib/live.ts` and `App.svelte`: pushes applied, polling only while the socket is down, reconnect with backoff.
- D81 proposed; web-ui spec, ARCHITECTURE and ROADMAP updated.
- Tests: `packages/daemon/test/live.test.ts` (16), `packages/ui/test/live.test.ts` (5).
- Follow-up: vantage-kbr6 (pass triggered by ingest, for the 2 s from event).
