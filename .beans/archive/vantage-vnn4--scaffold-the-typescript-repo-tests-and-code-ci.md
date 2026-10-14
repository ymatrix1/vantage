---
# vantage-vnn4
title: Scaffold the TypeScript repo, tests and code CI
status: completed
type: task
priority: high
tags:
    - phase-1
created_at: 2026-10-14T14:23:31Z
updated_at: 2026-10-14T15:56:38Z
parent: vantage-fmfh
---


## Context

No code exists yet. Every Phase 1 piece needs a shared toolchain: TypeScript on Node 20+, Vitest, lint, and the Phase 1 CI checks from docs/specs/ci.md. Blocked by: none.

## Higher Goal

One consistent, tested foundation so parallel work doesn't diverge.

## Acceptance Criteria

- [x] Workspace layout decided and documented in AGENTS.md (daemon, hooks, CLI, UI packages)
- [x] TypeScript strict, Oxlint (type-aware) and Oxfmt (D64), Vitest with a first passing test
- [x] CI runs type check, lint and tests on Windows and Linux; fixture scrub check in place
- [x] Event schema types shared across packages (docs/specs/ingestion.md event catalog)

## Out of Scope

Features themselves.

## Summary of Changes

- pnpm workspaces (D66): `packages/core` (event catalog v1 types, `parseEvent`), `daemon`, `hooks`, `cli` shells, `ui` (Svelte, Vite, Tailwind, shadcn-svelte config). Layout in AGENTS.md.
- TypeScript strict with project references; Oxlint type-aware with warnings as errors; Oxfmt; Vitest.
- `tools/check-fixtures.mjs`: fails fixtures without a synthetic/scrubbed header or with emails, URLs, tokens, UUIDs or home paths.
- `.github/workflows/code.yml`: all checks plus UI build on Ubuntu and Windows. `.gitattributes` forces LF.
- Tests: `packages/core/test/events.test.ts` (catalog, fixture replay, rejects), `tools/test/check-fixtures.test.ts`.
- Recorded D65 (shadcn-svelte, missed by PR #7's merge) and D66 (pnpm). Follow-up: vantage-8oas (svelte-check workaround).
