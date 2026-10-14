---
# vantage-f61l
title: Swap mirrored Track contract types for @vantage/core/track
status: todo
type: task
created_at: 2026-10-14T23:17:37Z
updated_at: 2026-10-14T23:17:37Z
parent: vantage-fmfh
---

## Context

Blocked by: the Track query API bean `vantage-r0kv` (PR not merged yet). `packages/ui/src/lib/contract.ts` mirrors the new `GET /api/track` response (`page`, `facets`, `groups`, `hasEdits`) because `@vantage/core/track` did not export it when the controls landed (`vantage-4ty4`).

## Higher Goal

One definition of the Track response, shared by the daemon and the page, so they cannot drift.

## Acceptance Criteria

- [ ] `contract.ts` imports the response types from `@vantage/core/track` and keeps only UI-only constants.
- [ ] The group ids the page collapses by default (`no_edits`, `older`) match what the daemon emits, or the daemon names them in the contract.
- [ ] `pnpm check` passes.

## Out of Scope

New controls or API changes.

## Summary of Changes

(filled in when done)
