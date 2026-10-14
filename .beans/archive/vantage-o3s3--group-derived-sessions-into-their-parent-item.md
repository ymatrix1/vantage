---
# vantage-o3s3
title: Group derived sessions into their parent item
status: completed
type: feature
created_at: 2026-10-14T23:06:50Z
updated_at: 2026-10-14T23:06:50Z
parent: vantage-fmfh
---

## Context

On the first real run the Track page lists hundreds of separate untitled `Session <id>` rows. The linker makes one provisional item per session when there is no ticket or branch anchor (D25 rule 4). Many of those sessions are derived: sub-agent runs, resumed or continued sessions, forks. Blocked by: none. Parallel sessions own `track.ts`, `stage.ts`, `api.ts`, `stages.ts` (Track API) and `packages/ui` (Track UI).

## Higher Goal

One card per piece of work, not one per session, using only signals the data really carries (cards move on evidence).

## Acceptance Criteria

- [x] Research note with counts and rates per lineage signal, from the real local data (aggregates only)
- [x] Ingest records `parentSessionId` and `lineage` from explicit signals
- [x] Linker attaches a derived session's events to its parent's item; each link stays individually undoable
- [x] Store exposes per-item `sessionCount` and `derivedCount` (new migration, tested from the previous version)
- [x] Tests: synthetic sidechain, resume, compaction, fork and no-signal cases; linker replay; unlink; migration
- [x] Specs (work-item-model, ingestion), ROADMAP updated
- [x] Heuristic grouping (same cwd and branch within a gap) recorded as a proposed decision with counts, not implemented

## Out of Scope

- Editing track.ts, stage.ts, api.ts, stages.ts, packages/ui
- Heuristic grouping rules
- Surfacing the counts in the API or UI (`vantage-a3mo`)

## Summary of Changes

- `session.derived` event kind and `transcriptLineage` / `sessionLineage` / `rootSession` (`packages/core/src/lineage.ts`); `agentId` kept on events from sub-agent lines and hooks.
- Linker: anchors first, then the family's anchored item, then the root session's provisional item (rule `derived-session`); per-event undo unchanged.
- Daemon: backfill reads copied history before the window filter; migration 4 adds the `item_sessions` view; `itemSessionCounts(store)` returns `sessionCount`, `derivedCount`, `subagentCount`.
- Research `docs/research/session-lineage.md` (counts only), specs, ROADMAP, proposed D86 and D87 (heuristic not built).
- Follow-ups: `vantage-a3mo` (show counts on Track), `vantage-j9ea` (branch on transcript tool events).
