---
# vantage-3vuw
title: Hook collector, spool and daemon ingest with transcript backfill
status: todo
type: feature
priority: high
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T14:23:32Z
parent: vantage-fmfh
blocked_by:
    - vantage-vnn4
---

## Context

Capture is the spine (D19, D21, D59). Spool hooks are async; the daemon reads the spool and backfills transcripts by byte offset into SQLite (D17, D33). Blocked by: the scaffold bean.

## Higher Goal

Never lose an event and never slow an agent down.

## Acceptance Criteria

- [ ] Async command hooks for SessionStart, PostToolUse, PostToolUseFailure, PermissionRequest, Notification, PreCompact, SessionEnd append JSON lines to the spool (D59)
- [ ] Hook test: under 100 ms, exit 0 with the daemon down
- [ ] Daemon ingests the spool into the events table, idempotent by source id (docs/specs/data-schema.md)
- [ ] Transcript backfill of the last 14 days by byte offset, deduplicated by tool-use id (R1 finding)
- [ ] Shell writes and commits detected as edits, not only edit tools (R1 finding)

## Out of Scope

Codex ingestion, OpenTelemetry (D61).

## Summary of Changes

TBD
