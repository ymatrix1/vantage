---
# vantage-ci4u
title: Capture test output summary for zero-test proof detection
status: todo
type: task
created_at: 2026-10-14T18:36:53Z
updated_at: 2026-10-14T18:36:53Z
parent: vantage-fmfh
---

## Context
D71 detects 0 tests run or all skipped only when a command.ran event carries result {run, skipped}. PostToolUse hooks capture no output yet, so that check is dormant.
Blocked by: none.

## Higher Goal
Fake proof detection per docs/specs/proof.md.

## Acceptance Criteria
- [ ] Hook or transcript ingest parses runner summaries (vitest, pytest, dotnet, dbt) into result {run, passed, failed, skipped} on command.ran, capped and scrubbed
- [ ] A test fails without the parser, and 0-test runs stop counting as proof

## Out of Scope
Storing full output.
