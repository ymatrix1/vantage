---
# vantage-3ebp
title: Component tests for the Track page
status: todo
type: task
created_at: 2026-10-14T19:11:02Z
updated_at: 2026-10-14T19:11:02Z
parent: vantage-fmfh
blocked_by:
    - vantage-olgf
---

## Context

`vantage-olgf` covers the view rules (`packages/core/test/track.test.ts`) and the API, but the repo has no Svelte component test tooling. Dots, Trace and the App states (loading, empty, error, stale, partial) and the keyboard map are verified only by svelte-check and a manual browser run. Blocked by: none.

## Higher Goal

Evidence over claims for the UI.

## Acceptance Criteria

- [ ] Component test setup for `packages/ui`, with the tooling choice recorded
- [ ] Tests for the five screen states, hollow dots and `j`, `k`, `Enter`, `Esc`, `?`
- [ ] A test that API strings render escaped (no HTML injection)

## Out of Scope

End-to-end browser tests.
