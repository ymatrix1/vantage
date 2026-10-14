---
# vantage-cji5
title: Emit session.stopped from the Stop hook so unproven_claim can fire
status: todo
type: task
created_at: 2026-10-14T18:36:53Z
updated_at: 2026-10-14T18:36:53Z
parent: vantage-fmfh
---

## Context
The stage machine raises unproven_claim from a session.stopped event after the last code edit. hookEvents ignores the Stop hook today, so the flag never fires on real data. Closely tied to the Stop gate (vantage-8nb2).
Blocked by: none.

## Higher Goal
Flag the unproven claim of done (lifecycle and flags specs).

## Acceptance Criteria
- [ ] Stop hook payload becomes a session.stopped event with a stable dedupe id
- [ ] A test replays a Stop payload through ingest and the stage pass

## Out of Scope
The gate's block mode.
