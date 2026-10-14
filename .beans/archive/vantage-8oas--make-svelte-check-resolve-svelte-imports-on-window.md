---
# vantage-8oas
title: Make svelte-check resolve .svelte imports on Windows
status: completed
type: bug
priority: low
created_at: 2026-10-14T15:56:21Z
updated_at: 2026-10-14T18:06:23Z
parent: vantage-fmfh
---


## Context
svelte-check reports TS7016 (no declaration for ./App.svelte) for .svelte imports from .ts files on the owner's Windows machine, with TypeScript 5.9 and 6. The scaffold works around it with packages/ui/src/svelte-modules.d.ts, which types those imports loosely. Blocked by: none.

## Higher Goal
Full component types in .ts files, no workaround.

## Acceptance Criteria
- [x] Root cause found (path casing, pnpm symlinks or svelte-check version)
- [x] svelte-modules.d.ts removed and pnpm typecheck passes on Windows and Linux
- [x] Regression guard: a `.svelte` import from `.ts` that fails the check if resolution breaks

## Out of Scope
Other UI work.

## Summary of Changes

Root cause: not Windows-specific and not path or symlink related. `App.svelte` had no `<script lang="ts">`, so svelte-check typed it as a JS module (its resolver maps the script kind to a `.js` extension). Under `strict` (noImplicitAny), importing a JS module without declarations from `main.ts` gives TS7016. Adding `<script lang="ts"></script>` to `App.svelte` fixes it.

- `packages/ui/src/App.svelte`: added an empty `<script lang="ts">` block.
- `packages/ui/src/svelte-modules.d.ts`: removed (the loose workaround).
- `packages/ui/src/svelte-import.guard.ts`: new. `@ts-expect-error` on unknown props to `mount(App, ...)` fails if `.svelte` resolution breaks or App loses real types.
