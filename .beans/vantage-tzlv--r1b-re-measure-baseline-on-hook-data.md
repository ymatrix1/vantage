---
# vantage-tzlv
title: 'R1b: re-measure baseline on hook data'
status: todo
type: task
created_at: 2026-10-14T13:42:05Z
updated_at: 2026-10-14T13:42:05Z
parent: vantage-pdgc
---

## Context

R1 (docs/research/baseline.md) measured from transcripts only: no true exit codes for Codex, no test counts, L2 by file-name proxy, subagent transcripts excluded, ghost candidates unlabeled. Blocked by: none (needs Phase 1 hooks to be useful).

## Higher Goal

Confirm Q3 (L2 default), Q2 (ghost precision) and P3 (thrash rule) with better data.

## Acceptance Criteria

- [ ] Re-run R1 measures on hook-captured events (exit codes, test counts)
- [ ] Include subagent transcripts in edit and proof counts
- [ ] Label a sample of strict ghost candidates and report precision
- [ ] Update docs/research/baseline.md with before and after

## Out of Scope

Review metrics (R4).

## Summary of Changes

TBD
