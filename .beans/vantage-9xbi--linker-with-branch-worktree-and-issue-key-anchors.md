---
# vantage-9xbi
title: Linker with branch, worktree and issue-key anchors
status: todo
type: feature
priority: normal
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T14:23:32Z
parent: vantage-fmfh
blocked_by:
    - vantage-3vuw
    - vantage-in31
---

## Context

Work items come from anchors (D25). Branches change mid-session in half of edit sessions, so each event links by its own branch (D54). Blocked by: collector and git scanner.

## Higher Goal

Deterministic, explainable links from events to work items.

## Acceptance Criteria

- [ ] Issue key wins, then branch or worktree, then provisional per-session items (D25)
- [ ] Per-event branch linking (D54)
- [ ] Every link has a method and can be undone (work item model)
- [ ] Replay test over synthetic fixtures

## Out of Scope

Inferred or embedding-based links (Q25).

## Summary of Changes

TBD
