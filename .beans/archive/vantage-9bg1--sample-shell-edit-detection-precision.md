---
# vantage-9bg1
title: Sample shell-edit detection precision
status: completed
type: task
priority: low
created_at: 2026-10-14T17:17:14Z
updated_at: 2026-10-14T18:20:46Z
parent: vantage-fmfh
---

## Context
Blocked by: none. Shell write detection (packages/core/src/shell.ts) flagged 4,944 of 7,877 file.edited events on 14 days of real transcripts. Commands were not inspected, so false positives (for example > inside quoted text) are unmeasured.

## Higher Goal
Cards move only on evidence: edits must be real.

## Acceptance Criteria
- [x] Label a sample of shell-detected edits locally (never committed) and report precision
- [x] Fix the patterns that cause false positives, each with a regression test on a synthetic command
- [x] Record the measured precision in docs/research or the ingestion spec

## Out of Scope
Detecting writes through non-shell tools.

## Summary of Changes
Sampled about 100 real Bash commands (14 days, 29,998 total), stratified by flag. Precision before: writes 84%, opaque 100%, commit 100%; after: writes 30 of 30. Fixed quoted-string and here-document false positives and added scripted-write and git mv detection in shell.ts, with 12 synthetic regression tests. Results in docs/research/shell-edit-precision.md. Follow-up bean filed for scratch-file writes.
