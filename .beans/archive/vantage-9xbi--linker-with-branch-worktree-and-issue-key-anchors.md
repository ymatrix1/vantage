---
# vantage-9xbi
title: Linker with branch, worktree and issue-key anchors
status: completed
type: feature
priority: normal
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T18:04:14Z
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

- [x] Issue key wins, then branch or worktree, then provisional per-session items (D25)
- [x] Per-event branch linking (D54)
- [x] Every link has a method and a rule, and can be undone in the store (work item model)
- Split out: the undo control in the item view belongs to the Track page bean (`vantage-olgf`), not this one.
- [x] Replay test over synthetic fixtures

## Out of Scope

Inferred or embedding-based links (Q25).

## Summary of Changes

- Added `packages/core/src/linker.ts`: pure `linkEvents`, `extractIssueKeys`, `undoKey`. Order: issue key, branch, detached linked worktree, provisional per-session item. Events link by their own branch (D54), resolved from the worktree path when the event has none.
- Added daemon migration 2 (`links` table), `linkStoredEvents`, `undoLink`, `linksForItem` in `packages/daemon/src/linking.ts`.
- Tests: 13 core replay tests over `linker-events.jsonl` (synthetic) and 3 daemon tests; ROADMAP and work-item-model updated.
- Not done: a scheduled link pass and the item-view undo control.
