---
# vantage-vnn4
title: Scaffold the TypeScript repo, tests and code CI
status: todo
type: task
priority: high
tags:
    - phase-1
created_at: 2026-10-14T14:23:31Z
updated_at: 2026-10-14T14:23:31Z
parent: vantage-fmfh
---

## Context

No code exists yet. Every Phase 1 piece needs a shared toolchain: TypeScript on Node 20+, Vitest, lint, and the Phase 1 CI checks from docs/specs/ci.md. Blocked by: none.

## Higher Goal

One consistent, tested foundation so parallel work doesn't diverge.

## Acceptance Criteria

- [ ] Workspace layout decided and documented in AGENTS.md (daemon, hooks, CLI, UI packages)
- [ ] TypeScript strict, Oxlint (type-aware) and Oxfmt (D64), Vitest with a first passing test
- [ ] CI runs type check, lint and tests on Windows and Linux; fixture scrub check in place
- [ ] Event schema types shared across packages (docs/specs/ingestion.md event catalog)

## Out of Scope

Features themselves.

## Summary of Changes

TBD
