---
# vantage-v1o3
title: 'vantage stats: measure how useful the Track page is'
status: completed
type: feature
priority: normal
created_at: 2026-10-14T23:09:21Z
updated_at: 2026-10-14T23:13:55Z
parent: vantage-fmfh
---


## Context

The first real run showed about 300 items in "Needs you" and hundreds of untitled Session rows. Three parallel fixes are in flight (API filters, the page, session lineage), and the Phase 1 exit is a week of daily use. The user needs numbers, not impressions, that are safe to paste into an issue. Blocked by: none.

## Higher Goal

Judge Phase 1 on evidence: did the fixes work, and is the Track page usable? Feeds the kill rule in the PRD.

## Acceptance Criteria

- [x] `vantage stats` opens the store read-only (daemon running or stopped) and never writes
- [x] Prints items total and active in 24 h, 7 d, 30 d; items per day; readable-title share; anchor kinds; Needs you (total, last 48 h, top flag kinds); derived-session share when data exists; stages and Built with no fresh proof; events by source and per day; database size; last stage pass age
- [x] Each metric has a plain-language meaning, and a status symbol against a starting-point goal where one makes sense
- [x] `--json`, `--since`, `--repo` and `--days N` (per-day trend) work
- [x] Output holds numbers and fixed labels only; the only echo is the typed `--repo`
- [x] Tests on a synthetic store: each metric, empty store, large counts, no title, path or repo name in output
- [x] README "Measuring it", operations spec and ROADMAP updated; proposed decision recorded

## Out of Scope

Writing to the store, a UI page for these numbers, remote telemetry, the lineage and API fixes themselves. Configurable goals (`vantage-36d3`) and the repo and lineage follow-ups once those schemas land (`vantage-jieo`).

## Summary of Changes

- `packages/cli/src/stats.ts`: `computeStats` (read-only queries over the derived tables), `renderStats` (table with meaning and goal symbol, per-day table) and `runStats` (`--json`, `--since`, `--repo`, `--days`).
- `vantage stats` wired in `cli.ts` and `index.ts`.
- `packages/cli/test/stats.test.ts`: synthetic store covering every metric, empty store, 50,000 items, byte-identical database after a run, and a no-leak check.
- README "Measuring it", operations spec, ROADMAP, and D87 (proposed).
- Goals stay constants; configurable goals are `vantage-36d3`.
