---
# vantage-xqdw
title: Back up vantage.db before running migrations
status: todo
type: task
priority: normal
created_at: 2026-10-14T23:34:25Z
updated_at: 2026-10-14T23:35:19Z
parent: vantage-fmfh
blocked_by:
    - vantage-3o22
---

## Context

`docs/specs/data-schema.md` and `docs/specs/operations.md` say schema migrations run "after an automatic backup" (keep the last 5), but `Store` takes no backup before migrating. Found while hardening the runner (bean vantage-3o22). The runner now refuses edited, missing or newer migrations; a backup is the remaining safety net for a migration that is wrong in a way no check catches. Blocked by: vantage-3o22.

## Higher Goal

Never lose or corrupt a user's evidence store on upgrade (D33).

## Acceptance Criteria

- [ ] Before applying any pending migration to an existing database, copy `vantage.db` (use SQLite's backup or `VACUUM INTO`, WAL-safe) to `~/.vantage/backups/vantage.db.<stamp>.before-<number>`
- [ ] Keep the last 5; never back up a fresh database or when nothing is pending
- [ ] Test: a version N database gets a backup that opens and holds the old rows; a no-op start makes none

## Out of Scope

Restore tooling beyond the existing `vantage doctor` hint; backups on a schedule.

## Summary of Changes

TBD
