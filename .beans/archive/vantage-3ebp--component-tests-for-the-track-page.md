---
# vantage-3ebp
title: Component tests for the Track page
status: completed
type: task
priority: normal
created_at: 2026-10-14T19:11:02Z
updated_at: 2026-10-14T22:17:53Z
parent: vantage-fmfh
blocked_by:
    - vantage-olgf
---

## Context

`vantage-olgf` covers the view rules (`packages/core/test/track.test.ts`) and the API, but the repo has no Svelte component test tooling. Dots, Trace and the App states (loading, empty, error, stale, partial) and the keyboard map are verified only by svelte-check and a manual browser run. Blocked by: none.

## Higher Goal

Evidence over claims for the UI.

## Acceptance Criteria

- [x] Component test setup for `packages/ui`, with the tooling choice recorded (D82, proposed)
- [x] Tests for the five screen states, hollow dots and `j`, `k`, `Enter`, `Esc`, `?`
- [x] A test that API strings render escaped (no HTML injection)

## Out of Scope

End-to-end browser tests.

## Summary of Changes

- Second Vitest project `packages/ui` (happy-dom 21.0.1, Svelte `mount`, browser condition); root config now lists projects. Tooling recorded as proposed D82.
- 30 tests in `packages/ui/test/`: five screen states, hollow dots, keyboard map, trace view, escaping. Each was checked by breaking the page behaviour and seeing the test fail.
- No page behaviour changed; no bug found.
