---
# vantage-ci4u
title: Capture test output summary for zero-test proof detection
status: completed
type: task
priority: normal
created_at: 2026-10-14T18:36:53Z
updated_at: 2026-10-14T19:02:26Z
parent: vantage-fmfh
---

## Context
D71 detects 0 tests run or all skipped only when a command.ran event carries result {run, skipped}. PostToolUse hooks capture no output yet, so that check is dormant.
Blocked by: none.

## Higher Goal
Fake proof detection per docs/specs/proof.md.

## Acceptance Criteria
- [x] Hook or transcript ingest parses runner summaries (vitest, jest, pytest, go test, dotnet; dbt split to a new bean) into result {run, passed, failed, skipped} on command.ran, capped and scrubbed
- [x] A test fails without the parser, and 0-test runs stop counting as proof

## Out of Scope
Storing full output.

## Summary of Changes

Added `parseTestSummary` in core (vitest, jest, pytest, go test, dotnet test; numbers only) and wired it into `toolCallEvents` for hook `tool_response` and transcript `tool_result` output. `command.ran.result` is absent when output is unrecognised. dbt summaries were not done and moved to a follow-up bean. Proposed decision D77; ingestion spec updated.
