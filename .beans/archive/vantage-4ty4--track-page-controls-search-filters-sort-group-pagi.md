---
# vantage-4ty4
title: 'Track page controls: search, filters, sort, group, pagination'
status: completed
type: feature
priority: normal
created_at: 2026-10-14T23:06:23Z
updated_at: 2026-10-14T23:17:39Z
parent: vantage-fmfh
---


## Context

First real run showed 300 rows flagged "Needs you", untitled rows and no grouping, filtering, sorting or paging. The API session (`track-api`) adds query parameters, facets, groups and a `page` block to `GET /api/track`. This bean builds the page controls in `packages/ui`. Blocked by: the API PR for the real types (the UI mirrors the contract in a local file until it merges).

## Higher Goal

A Track page that stays readable with hundreds of items: the user can find the work that needs them in seconds (Phase 1 exit: the page shows the true state of work).

## Acceptance Criteria

- [x] Toolbar: debounced search (`/` focuses), filter chips with live counts from `facets` (repo, stage, proof, flag, age, has code edits), sort with direction, group-by, page size
- [x] Pagination: first, previous, next, last, "26 to 50 of 312"
- [x] Default view: group by attention, since 7d, recent activity; "Conversations without code" and "Older" collapsed; group headers are headings showing totals and collapse
- [x] Flags show their reason text
- [x] View state lives in the URL query string and is remembered locally; the token never enters the query string, history or localStorage
- [x] Clear all filters; empty-result message names the filter that removed everything; loading keeps previous rows
- [x] Keyboard: `/`, `[`, `]`, `1`/`2`/`3`/`4` group-by added; j, k, Enter, Esc, ? unchanged (no `g` chords: `g s` is Sources, D85)
- [x] Live pushes keep working without changing the page; pushes outside the filter update facets only
- [x] Component tests (URL state, each control, pagination edges, empty state, collapsed groups, keyboard, no token in URL or history, escaped markup)
- [x] Run in the browser pane against a synthetic daemon
- [x] `docs/specs/web-ui.md` and `docs/ROADMAP.md` updated

## Out of Scope

Swapping the mirrored types for `@vantage/core/track` (follow-up bean, blocked by the API PR). Daemon filtering, sorting and pagination (API session). Item page. Command palette. Context switch.

## Summary of Changes

- `packages/ui/src/lib/view.ts`: view state, query string build and parse (validated, capped), blockers for the empty state.
- `contract.ts`: local mirror of the new `/api/track` response; `Toolbar.svelte`, `Pagination.svelte`; `App.svelte` rewritten around the URL as the source of truth (pushState, popstate, remembered view, aborted stale requests, previous rows kept while loading).
- `live.ts`: pushes update visible rows in place only; other changes refresh counts through one throttled refetch (`mergeCounts`).
- Keys `/`, `[`, `]`, `1` to `4`. Decision D85 proposed. web-ui spec and ROADMAP updated.
- Tests: 84 UI tests (controls, view, live, escaping). Run against a synthetic daemon in the browser pane.
- Follow-up: swap the mirrored types once the API PR merges (new bean).
