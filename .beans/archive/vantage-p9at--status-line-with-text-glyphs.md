---
# vantage-p9at
title: Status line with text glyphs
status: completed
type: feature
priority: normal
tags:
    - phase-1
created_at: 2026-10-14T14:23:33Z
updated_at: 2026-10-14T19:09:03Z
parent: vantage-fmfh
blocked_by:
    - vantage-lxud
---

## Context

The always-visible surface (docs/specs/status-line.md, D41). Reads a summary file the daemon writes; refreshInterval 30 s (R2). Blocked by: the stage machine.

## Higher Goal

Ambient awareness without opening anything.

## Acceptance Criteria

- [x] Glyph mapping and layout per the status-line spec, with and without color
- [ ] Truncation at 80, 60 and 40 columns; stale summary handling
- [ ] Reads under 10 ms (operations budget)

## Out of Scope

Desktop app status line (Q29).

## Summary of Changes

Pure renderer and parser in packages/core/src/status-line.ts (glyph mapping, color optional, width-aware truncation, stale and offline lines). Daemon writer packages/daemon/src/status-file.ts, called by the stage loop after every pass. Command packages/hooks/src/statusline-bin.js plus statusLineSettings snippet. Core package exports now point at dist/src (the old path did not exist), plus a status-line subpath. Decision D73 proposed. Remaining: wiring the loop into a running daemon (new bean).
