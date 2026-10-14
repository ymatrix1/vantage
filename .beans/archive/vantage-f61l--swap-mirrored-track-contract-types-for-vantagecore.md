---
# vantage-f61l
title: Swap mirrored Track contract types for @vantage/core/track
status: completed
type: task
priority: normal
created_at: 2026-10-14T23:17:37Z
updated_at: 2026-10-14T23:35:38Z
parent: vantage-fmfh
---


## Context

Blocked by: the Track query API bean `vantage-r0kv` (PR not merged yet). `packages/ui/src/lib/contract.ts` mirrors the new `GET /api/track` response (`page`, `facets`, `groups`, `hasEdits`) because `@vantage/core/track` did not export it when the controls landed (`vantage-4ty4`).

## Higher Goal

One definition of the Track response, shared by the daemon and the page, so they cannot drift.

## Acceptance Criteria

- [x] `contract.ts` imports the response types from `@vantage/core/track` and keeps only UI-only constants.
- [x] The "Conversations without code" and "Older" groups work with what the daemon really sends: it emits no such group ids, so the page builds them from `hasEdits` and `lastActivity`.
- [x] `pnpm check` passes.

## Out of Scope

New controls or API changes.

## Summary of Changes

`contract.ts` now re-exports the merged types from `@vantage/core/track`. New `fold.ts` builds the two quiet groups client-side (the daemon sends none). "N sessions" shows when `sessionCount` is above 1; the daemon has the counts (`lineage.ts`) but `/api/track` does not send them yet. Checked against the real daemon with a synthetic store.
