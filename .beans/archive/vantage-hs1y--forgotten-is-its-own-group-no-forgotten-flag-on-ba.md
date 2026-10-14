---
# vantage-hs1y
title: Forgotten is its own group; no forgotten flag on backfilled conversations
status: completed
type: task
created_at: 2026-10-14T23:41:45Z
updated_at: 2026-10-14T23:41:45Z
parent: vantage-fmfh
---

## Context

Blocked by: none. Measured on the user's real database with `vantage stats`: 308 items carry an open flag: `forgotten` 292, `thrashing` 27, `unproven_claim` 8. So "Needs you" is mostly `forgotten` items from the 14-day backfill, not urgent work. #52 left `forgotten` unchanged.

## Higher Goal

"Needs you" must mean only what needs the user now.

## Acceptance Criteria

- [x] `forgotten` is not urgent: a separate attention group "Forgotten" (listed last, collapsed by the UI), counted separately; "Needs you" holds only items with `thrashing` or `unproven_claim`; the `flag` facet keeps all three kinds.
- [x] `forgotten` is not raised for an item that had no code edit and whose last activity was already older than the threshold when Vantage first saw it (backfilled conversations).
- [x] Tests with a fake clock for each case; docs and a new proposed decision.

## Out of Scope

UI work; changing the 5-day threshold.

## Summary of Changes

`forgotten` is its own attention group (low urgency, listed after Waiting, before Done); `needs_you` means only `thrashing` or `unproven_claim`; group totals and docs updated; the `flag` facet keeps all three kinds. `StageOptions.firstSeen` (from `work_items.created_at`) suppresses `forgotten` for a no-code-edit item already older than the threshold when first seen. Fake-clock tests in core and through the stage pass. Proposed D94.
