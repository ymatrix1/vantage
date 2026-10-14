---
# vantage-8yef
title: 'Track page controls: filters, sort, group, paging'
status: scrapped
type: task
priority: normal
created_at: 2026-10-14T23:08:56Z
updated_at: 2026-10-14T23:25:22Z
parent: vantage-fmfh
blocked_by:
    - vantage-r0kv
---

## Context

Blocked by: the Track query API bean. The Track page lists every item in one unfiltered list. The API adds filters, sorting, grouping, paging and facets; the page needs controls for them.

## Higher Goal

Make the Track page usable at hundreds of items.

## Acceptance Criteria

- [ ] Controls for search, repo, stage, proof, flag, since, hasEdits, sort, order, group and paging, kept in the URL.
- [ ] Facet counts shown live; "Conversations without code" group for `hasEdits: false`; flag reasons shown.
- [ ] Component tests; loading, empty, error states still handled.

## Out of Scope

API changes.

## Summary of Changes

(filled in when done)

## Reasons for Scrapping

Duplicate: the UI session created vantage-4ty4 (PR #50) for the same work.
