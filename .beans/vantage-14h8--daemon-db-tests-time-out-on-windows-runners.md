---
# vantage-14h8
title: Daemon DB tests time out on Windows runners
status: in-progress
type: bug
priority: normal
created_at: 2026-10-14T19:16:52Z
updated_at: 2026-10-14T19:17:49Z
parent: vantage-fmfh
---

## Context

packages/daemon/test/stages.test.ts (migration 3) timed out at the 5 s default on windows-latest once, then passed on rerun (PR #25, run 38621805790). A flaky required check slows every PR. Blocked by: none.

## Higher Goal

CI failures mean something. A flaky timeout teaches people to rerun.

## Acceptance Criteria

- [x] Test and hook timeout raised to 20 s in vitest.config.ts with the reason in a comment
- [ ] No timeout failure on windows-latest over the next merged PRs (watch; reopen if it recurs)

## Out of Scope

Making the tests faster; changing assertions.

## Summary of Changes

- `vitest.config.ts`: `testTimeout` and `hookTimeout` 20 s, with the reason in a comment. Local: `pnpm typecheck`, `pnpm lint`, `pnpm test` pass (188 tests). The second criterion stays open: watch the next merged PRs.
