---
# vantage-in31
title: git scanner for registered repos and worktrees
status: todo
type: feature
priority: normal
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T14:23:32Z
parent: vantage-fmfh
blocked_by:
    - vantage-vnn4
---

## Context

Built and dirty state come from git (D3). Worktrees are the norm (92% of sessions in R1). Blocked by: the scaffold bean.

## Higher Goal

Know what code exists, committed or not, without asking the agent.

## Acceptance Criteria

- [ ] Registered repos and their worktrees discovered automatically
- [ ] Commits, branch checkouts, merges and dirty files emitted as events (ingestion catalog)
- [ ] Scan cadence per ingestion spec (30 s active, 10 min idle); read-only git commands with no optional locks
- [ ] Repos matched by remote URL and first commit, not path (operations edge cases)

## Out of Scope

GitHub PR data (Phase 4).

## Summary of Changes

TBD
