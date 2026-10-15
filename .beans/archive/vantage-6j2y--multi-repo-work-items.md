---
# vantage-6j2y
title: Multi-repo work items
status: completed
type: feature
priority: normal
created_at: 2026-10-15T13:19:03Z
updated_at: 2026-10-15T13:26:44Z
---

## Context
User feedback: a session or work item can touch several repos; today an item has one repo. Blocked by: none.

## Higher Goal
Track shows the true state of work even when it spans repos (Phase 1 usability).

## Acceptance Criteria
- [x] New migration 0011 stores the set of repos per item
- [x] Stage pass fills it from cwds, edited paths and git events
- [x] API: items carry repos[], filters match any repo, facets count once per repo (D190)
- [x] UI: chips in row and detail
- [x] docs, specs, tests

## Out of Scope
Session names, Asked line, Open in Claude (follow-up PR).

## Summary of Changes

Migration 0011 `item_repos`; `itemRepoSet` fills it in the stage pass; API `repos`, any-repo filters and per-repo facets (D190); chips in Row and Detail; specs, UX, ROADMAP; tests in `multi-repo.test.ts` and `track-v2.test.ts`.
