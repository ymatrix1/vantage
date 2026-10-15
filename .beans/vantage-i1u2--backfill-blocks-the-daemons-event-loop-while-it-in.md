---
# vantage-i1u2
title: Backfill blocks the daemon's event loop while it ingests
status: todo
type: bug
priority: low
created_at: 2026-10-15T14:08:39Z
updated_at: 2026-10-15T14:08:39Z
---

## Context
Measured on a copy of a real store (about 500 transcripts, stale by days): the transcript backfill ingest took 41 to 51 s in one synchronous pass, so the HTTP server (started before it) cannot answer until it ends. Steady state is about 1 s. D195's deep reads are budgeted per pass and add about 1 to 2 s per pass for about 11 passes. Blocked by: none.

## Higher Goal
Startup stays responsive on a large or stale store.

## Acceptance Criteria
- [ ] Ingest yields between files (or runs in a worker) so a request is answered within about 200 ms during a backfill
- [ ] Test with a fake clock or large synthetic store

## Out of Scope
Changing what is ingested.
