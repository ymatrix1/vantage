---
# vantage-olgf
title: Minimal Track page on a secured local server
status: completed
type: feature
priority: normal
tags:
    - phase-1
created_at: 2026-10-14T14:23:33Z
updated_at: 2026-10-14T19:11:15Z
parent: vantage-fmfh
blocked_by:
    - vantage-lxud
---

## Context

Phase 1 exit needs the morning catch-up on a page. Svelte (D62), served by the daemon on 127.0.0.1 with a token (D32). Blocked by: the stage machine.

## Higher Goal

The first visual surface, built on the shared dot alphabet.

## Acceptance Criteria

- [x] Track rows grouped by attention with the six-dot track (docs/UX.md, visual-language spec)
- [x] Server binds to 127.0.0.1, token on every request, Origin and Host checks, no state change on GET (D32), with tests
- [x] Live updates by polling `GET /api/track` every 5 s (D75, proposed)
- [x] Loading, empty, error, stale and partial states (web-ui spec)

## Out of Scope

Landscape, Focus, Explain (Phase 3). Split out when the box could not be ticked honestly: live updates over WebSocket (`vantage-tizy`), starting the server and `vantage open` (`vantage-6bni`), component tests (`vantage-3ebp`, the repo has no Svelte test tooling yet).

## Summary of Changes

- `@vantage/core` `track.ts`: attention grouping, six-dot rules and the API response types, shared by daemon and UI (pure, tested).
- `@vantage/daemon`: `startHttp` bound to 127.0.0.1 (Host, Origin and token checks, GET and HEAD only, no CORS, CSP on the static shell), `loadOrCreateToken` (0600 file), read-only `/api/track`, `/api/items/:id/trace`, `/api/diagnostics`.
- `@vantage/ui`: Track page with attention groups, six-dot rows (hollow when skipped or unconfigured), loading, empty, error, stale and partial states, `j`, `k`, `Enter` (trace), `Esc`, `?`; token taken from the URL fragment.
- Docs: D75 proposed, web-ui spec, architecture token line, ROADMAP.
- Follow-ups: `vantage-tizy` (WebSocket), `vantage-6bni` (start and open), `vantage-3ebp` (component tests).
