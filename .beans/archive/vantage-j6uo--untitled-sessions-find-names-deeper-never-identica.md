---
# vantage-j6uo
title: 'Untitled sessions: find names deeper, never identical'
status: completed
type: bug
created_at: 2026-10-15T14:04:48Z
updated_at: 2026-10-15T14:04:48Z
---

## Context
Live page: ~7 rows titled 'repo · Oct 15', all alike. Blocked by: none.

## Higher Goal
Every row is recognisable.

## Acceptance Criteria
- [x] Names read from transcripts already ingested (D195)
- [x] Typed request found past the first 256 KB
- [x] Untitled rows never identical
- [x] Synthetic tests

## Out of Scope
Titling forks from their parent.

## Summary of Changes
Edge scan for session names, one deeper request read, collision retitle (file then id). Real-data check on a copy: 0 fallback rows left of 16.
