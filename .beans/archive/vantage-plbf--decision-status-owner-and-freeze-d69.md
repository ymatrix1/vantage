---
# vantage-plbf
title: Decision status, owner and freeze (D69)
status: completed
type: task
priority: normal
created_at: 2026-10-14T18:39:00Z
updated_at: 2026-10-14T18:39:15Z
parent: vantage-pdgc
---

## Context

DECISIONS.md had no status, owner or protection against edits; the rule that only the user accepts a decision was convention. Prosper's ADRs show the pattern. Blocked by: none.

## Higher Goal

Decision history stays true and the 'only the user accepts' rule is checkable.

## Acceptance Criteria

- [x] Status, Decided by and Superseded by on every decision (68 existing, plus D69)
- [x] check_docs.py checks fields, status, section and successor, and freezes accepted decisions against the base branch
- [x] Unit tests for the checks, run in the docs CI job
- [x] Rules, AGENTS.md and update-spec skill name the new fields

## Out of Scope

Per-file ADRs (docs/adr), status history, a link from specs to decision ids.

## Summary of Changes

- tools/decisions_check.py with tests; check_docs.py calls it.
- DECISIONS.md: lifecycle section, Status and Decided by on all decisions, D69.
- docs.yml runs the checker tests; rules, AGENTS.md and update-spec updated.
