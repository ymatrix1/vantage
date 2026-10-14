---
# vantage-9bg1
title: Sample shell-edit detection precision
status: todo
type: task
priority: low
created_at: 2026-10-14T17:17:14Z
updated_at: 2026-10-14T17:17:14Z
parent: vantage-fmfh
---

## Context
Blocked by: none. Shell write detection (packages/core/src/shell.ts) flagged 4,944 of 7,877 file.edited events on 14 days of real transcripts. Commands were not inspected, so false positives (for example > inside quoted text) are unmeasured.

## Higher Goal
Cards move only on evidence: edits must be real.

## Acceptance Criteria
- [ ] Label a sample of shell-detected edits locally (never committed) and report precision
- [ ] Fix the patterns that cause false positives, each with a regression test on a synthetic command
- [ ] Record the measured precision in docs/research or the ingestion spec

## Out of Scope
Detecting writes through non-shell tools.

## Summary of Changes
TBD
