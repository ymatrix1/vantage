---
# vantage-r0kv
title: 'Track query API: flag window, filters, sort, paging, facets'
status: completed
type: task
priority: normal
created_at: 2026-10-14T23:08:52Z
updated_at: 2026-10-14T23:20:44Z
parent: vantage-fmfh
---

## Context

Blocked by: none. First real run: Track shows "Needs you · 300", all with `thrashing`, mostly from the 14-day transcript backfill, plus 300 untitled `Session <id>` rows with no grouping, filtering, sorting or paging.

## Higher Goal

The morning catch-up must answer "what needs me now" in seconds, at any item count.

## Acceptance Criteria

- [x] `thrashing` and `unproven_claim` raised only for items active within `flagWindowHours` (default 48, config `flag_window_hours`); older items keep stage and proof state.
- [x] Flags carry a short reason with file base names only.
- [x] `GET /api/track` accepts and validates repo, branch, stage, proof, flag, since, hasEdits, q, sort, order, group, page, pageSize; bad input gives 400.
- [x] Response adds `page`, `facets`, groups with `id`, `label`, `total`; items carry `hasEdits`, `branch`.
- [x] Untitled sessions get a fallback title from repo, branch and first activity date.
- [x] Filtering, sorting and paging run in SQL with an index migration, tested from the previous schema version.
- [x] Tests for each parameter, combinations, 400s, pagination edges, facets, flag window with a fake clock.
- [x] `docs/specs/web-ui.md`, `docs/ROADMAP.md` updated; new proposed decision recorded.

## Out of Scope

UI controls (separate bean); naming items from prompt text (privacy decision for the user); Reviewed, Shipped and Verified stages.

## Summary of Changes

Core: `thrashing` and `unproven_claim` only for items active within `flagWindowHours` (default 48), reasons name files by base name, items carry repo and branch; `parseTrackQuery` validates every parameter against allow-lists; `fallbackTitle`. Daemon: `trackView` filters, sorts, pages, groups and counts facets in SQL (bound parameters only); `GET /api/track` answers 400 for bad input; migration 4 (`branch`, `has_edits`, three indexes); `flag_window_hours` in `config.toml`; titles of existing rows are rewritten on the next pass. Docs: proposed D84, web-ui API table, data schema, operations, ROADMAP. Tests: 44 new daemon tests, 11 new core tests plus updated version assertions. The new response fields are optional in the shared core types so the UI package keeps type-checking; `vantage-8yef` should tighten them with `TrackView`.
