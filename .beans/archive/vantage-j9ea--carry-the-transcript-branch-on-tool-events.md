---
# vantage-j9ea
title: Carry the transcript branch on tool events
status: completed
type: task
priority: normal
created_at: 2026-10-14T23:17:12Z
updated_at: 2026-10-14T23:24:41Z
parent: vantage-fmfh
---

## Context

Blocked by: none. Measured in `docs/research/session-lineage.md`: 506 of 518 sessions are on a non-default branch by the transcript `gitBranch`, but `file.edited` and `command.ran` events from transcripts carry no `branch` (only prompts do), so the linker finds the branch only through a scanned worktree. Unverified on the live store whether this is why many sessions end as provisional items.

## Higher Goal

Fewer untitled Session rows: events anchor on their real branch (D54).

## Acceptance Criteria

- [x] Measure on the live store how many provisional session items sit on a non-default transcript branch (counts only): 125 of 137 sessions with edits had every edit in a per-session item
- [x] If the cause is confirmed, tool events carry `branch` from the transcript line, with a replay test
- [x] Events stored before, or by a hook, get the branch through an idempotent one-shot backfill (`event_branches`), tested from a store before the change
- [x] Before and after counts on the real store in `docs/research/session-lineage.md`

## Out of Scope

- Derived-session grouping (`vantage-o3s3`)

## Summary of Changes

- Transcript tool events carry `payload.branch` (nearest earlier line of the session; detached `HEAD` is none); the prompt event follows the same reading.
- Migration 6 adds `event_branches`; `loadEvents` fills `payload.branch` from it; `backfillEventBranches` is a one-shot over the 14-day window, run from `backfillTranscripts`.
- No linker rule change: D25 rules 1 and 2 read `payload.branch`; tests prove worktree branches, issue keys, default, detached and unknown.
- Real store: sessions with an anchored edit 12 to 129 of 137, `Session` items 130 to 33, edits in per-session items 96% to 14%.
- Proposed D92; docs: ingestion, work-item-model, data-schema, ROADMAP, research.
