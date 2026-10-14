---
# vantage-7f0z
title: Dot legend, stage label and dash for skipped dots
status: completed
type: task
created_at: 2026-10-14T23:25:18Z
updated_at: 2026-10-14T23:25:18Z
parent: vantage-fmfh
---

## Context

The user could not read the six dots on a real row. Same PR as `vantage-4ty4` (Track controls). Blocked by: none.

## Higher Goal

Dots that a reader can learn and read at 16 px without hovering.

## Acceptance Criteria

- [x] Legend ("What the dots mean"): six stages with their question, six states drawn with the real dot component, shape-first note, keyboard reachable, Esc closes, no focus trap, text only
- [x] Row label from stage, proof status, proof level, docs-only and flags (pure function, tests for every combination)
- [x] Skipped dot is a short dash, not-yet stays the thin ring; tests assert both; forced-colours rule
- [x] Status line skipped glyph is an en dash; tests and spec updated
- [x] Specs updated (visual-language, UX, web-ui, status-line); decision proposed

## Out of Scope

Per-dot keyboard focus (dots sit inside the row button). Static mockups in `docs/mockups/`.

## Summary of Changes

`Dot.svelte` (one dot, dash for skipped), `Dots.svelte`, `Legend.svelte`, `legend.ts` (shared words), `stage-label.ts`, forced-colours CSS, status-line glyph, tests (`legend`, `stage-label`, `dots`, core status line), specs, proposed decision.
