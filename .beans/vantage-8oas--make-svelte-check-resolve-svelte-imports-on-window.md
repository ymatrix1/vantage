---
# vantage-8oas
title: Make svelte-check resolve .svelte imports on Windows
status: todo
type: bug
priority: low
created_at: 2026-10-14T15:56:21Z
updated_at: 2026-10-14T15:56:21Z
parent: vantage-fmfh
---

## Context
svelte-check reports TS7016 (no declaration for ./App.svelte) for .svelte imports from .ts files on the owner's Windows machine, with TypeScript 5.9 and 6. The scaffold works around it with packages/ui/src/svelte-modules.d.ts, which types those imports loosely. Blocked by: none.

## Higher Goal
Full component types in .ts files, no workaround.

## Acceptance Criteria
- [ ] Root cause found (path casing, pnpm symlinks or svelte-check version)
- [ ] svelte-modules.d.ts removed and pnpm typecheck passes on Windows and Linux

## Out of Scope
Other UI work.

## Summary of Changes
TBD
