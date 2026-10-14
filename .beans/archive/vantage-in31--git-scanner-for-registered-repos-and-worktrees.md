---
# vantage-in31
title: git scanner for registered repos and worktrees
status: completed
type: feature
priority: normal
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T16:37:52Z
parent: vantage-fmfh
blocked_by:
    - vantage-vnn4
---


## Context

Built and dirty state come from git (D3). Worktrees are the norm (92% of sessions in R1). Blocked by: the scaffold bean.

## Higher Goal

Know what code exists, committed or not, without asking the agent.

## Acceptance Criteria

- [x] Registered repos and their worktrees discovered automatically
- [x] Commits, branch checkouts, merges and dirty files emitted as events (ingestion catalog)
- [x] Scan cadence per ingestion spec (30 s active, 10 min idle); read-only git commands with no optional locks
- [x] Repos matched by remote URL and first commit, not path (operations edge cases)

## Out of Scope

GitHub PR data (Phase 4).

## Summary of Changes

- `packages/core/src/git.ts`: pure parsers (worktree list, status v2, log), remote URL normalisation, `repoKey` (remote + first commit, not path), `diffScan` (commit, merge, revert, checkout, dirty events), `scanIntervalMs` (30 s active, 10 min idle, doubled on battery saver).
- `packages/daemon/src/git-scanner.ts`: read-only git runner (`--no-optional-locks`), worktree discovery, per-worktree cursors, per-scan dedup of shared commits.
- Tests: 29 total, scripted synthetic temp repos with isolated git config.
- Shared tweaks: `lib: ES2023` in `tsconfig.base.json`; Vitest alias so `@vantage/core` resolves to source.
- Not done: scheduling loop and cursor persistence belong to the daemon bean (cadence helper exists); git hooks fast path is `vantage-3vuw` scope.
