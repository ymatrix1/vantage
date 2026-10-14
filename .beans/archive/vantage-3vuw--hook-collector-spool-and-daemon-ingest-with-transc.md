---
# vantage-3vuw
title: Hook collector, spool and daemon ingest with transcript backfill
status: completed
type: feature
priority: high
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T16:39:52Z
parent: vantage-fmfh
blocked_by:
    - vantage-vnn4
---


## Context

Capture is the spine (D19, D21, D59). Spool hooks are async; the daemon reads the spool and backfills transcripts by byte offset into SQLite (D17, D33). Blocked by: the scaffold bean.

## Higher Goal

Never lose an event and never slow an agent down.

## Acceptance Criteria

- [x] Async command hooks for SessionStart, PostToolUse, PostToolUseFailure, PermissionRequest, Notification, PreCompact, SessionEnd append JSON lines to the spool (D59)
- [x] Hook test: exit 0 with the daemon down
- [x] Hook test: in-process `collect` under 100 ms
- [ ] Cold start of the real hook command under 100 ms (tracked in vantage-of25)
- [x] Daemon ingests the spool into the events table, idempotent by source id (docs/specs/data-schema.md)
- [x] Transcript backfill of the last 14 days by byte offset, deduplicated by tool-use id (R1 finding)
- [x] Shell writes and commits detected as edits, not only edit tools (R1 finding)

## Out of Scope

Codex ingestion, OpenTelemetry (D61).

## Summary of Changes

- `@vantage/core`: `claude-code.ts` normalizes hook payloads and transcript lines into events; `shell.ts` detects shell writes (redirects, tee, Set-Content, sed -i, apply_patch) and `git commit`, emitted as `file.edited` with `via: shell` / `shell-commit`. Event ids use the tool-use id only, so hook, backfill and resumed or forked sessions collapse to one row.
- `@vantage/hooks`: dependency-free collector (`collect`, `bin.ts`) appends `{v, receivedAt, hook}` to `~/.vantage/spool/<day>.jsonl`, always exits 0; `hooksSettings()` builds the async hook registration for the seven spool events (D59).
- `@vantage/daemon`: SQLite store (`node:sqlite`, WAL, numbered migrations, unique `(source, source_id)`), byte-offset spool ingest and 14-day transcript backfill with cursors, `runOnce`.
- Tests: 43 passing (shell detection, hook mapping, dedupe across hook and backfill, partial lines, lost cursor, window cutoff, collector exit codes).
- Hook timing: only the in-process `collect` is tested under 100 ms. The real hook command (a cold `node` process) measured about 215 ms on this machine, so the 100 ms budget is NOT met end to end. Not covered: cold start of the real command, on any machine but this one. Hooks are async (D59), so the agent is not blocked. That box stays unticked and is owned by vantage-of25 (parent vantage-fmfh, blocked by nothing).
- Not done: installing the hooks into the user's settings, a long-running daemon loop, backup before migrations (needed once schema v2 exists).
