---
# vantage-knna
title: Journal page with 'since yesterday'
status: draft
type: feature
created_at: 2026-10-14T20:10:26Z
updated_at: 2026-10-14T20:10:26Z
parent: vantage-nqh6
---

## Context

docs/UX.md Journal and web-ui.md define a timeline by day then project, default range since the user was last active, one line per entry, filters by project and context. Phase 1 stores stage_changes and events. Blocked by: none.

## Higher Goal

The morning standup: what moved since yesterday, without scrolling an event feed.

## Acceptance Criteria

- [ ] GET /api/journal?since= returns stage changes and flags per day and project (no raw event feed)
- [ ] Journal page with day grouping, project chips and the default range since last activity
- [ ] 'Moved since yesterday' marker on Track rows whose stage changed
- [ ] Tests for range edges and an empty day

## Out of Scope

Merges, deploys, regressions and mentions (need sources from later phases); contexts beyond Work.

## Summary of Changes

TBD
