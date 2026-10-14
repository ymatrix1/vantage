---
# vantage-olgf
title: Minimal Track page on a secured local server
status: todo
type: feature
priority: normal
tags:
    - phase-1
created_at: 2026-10-14T14:23:33Z
updated_at: 2026-10-14T14:23:33Z
parent: vantage-fmfh
blocked_by:
    - vantage-lxud
---

## Context

Phase 1 exit needs the morning catch-up on a page. Svelte (D62), served by the daemon on 127.0.0.1 with a token (D32). Blocked by: the stage machine.

## Higher Goal

The first visual surface, built on the shared dot alphabet.

## Acceptance Criteria

- [ ] Track rows grouped by attention with the six-dot track (docs/UX.md, visual-language spec)
- [ ] Server binds to 127.0.0.1, token on every request, Origin and Host checks, no state change on GET (D32), with tests
- [ ] Live updates over WebSocket
- [ ] Loading, empty, error and stale states (web-ui spec)

## Out of Scope

Landscape, Focus, Explain (Phase 3).

## Summary of Changes

TBD
