---
# vantage-p9at
title: Status line with text glyphs
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

The always-visible surface (docs/specs/status-line.md, D41). Reads a summary file the daemon writes; refreshInterval 30 s (R2). Blocked by: the stage machine.

## Higher Goal

Ambient awareness without opening anything.

## Acceptance Criteria

- [ ] Glyph mapping and layout per the status-line spec, with and without color
- [ ] Truncation at 80, 60 and 40 columns; stale summary handling
- [ ] Reads under 10 ms (operations budget)

## Out of Scope

Desktop app status line (Q29).

## Summary of Changes

TBD
