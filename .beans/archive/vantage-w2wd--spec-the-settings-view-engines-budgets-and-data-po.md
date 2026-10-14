---
# vantage-w2wd
title: 'Spec the Settings view: engines, budgets and data policy'
status: completed
type: task
priority: normal
created_at: 2026-10-14T17:58:57Z
updated_at: 2026-10-14T18:02:01Z
parent: vantage-pdgc
---

## Context

The design has no place to choose which model or engine Vantage uses, or to switch outside calls on. UX.md lists settings without model fields; Explain layer 4 and the judgment layer both depend on engine choices; data policy (vantage-h8fv) is undecided. Blocked by: none.

## Higher Goal

The user sees and controls what Vantage may send to a model, and which engine answers, in one place. Everything that leaves the machine defaults to off.

## Acceptance Criteria

- [x] docs/specs/settings.md defines engines, budgets and data policy keys, defaults and the Settings view
- [x] UX, operations, web-ui (API) and README link to it
- [x] Decision D68 recorded with all five fields, and indexed
- [x] python tools/check_docs.py passes

## Out of Scope

Choosing the judgment model (Q4, vantage-ibuz). Deciding the company data policy (vantage-h8fv). Any code.

## Summary of Changes

- New `docs/specs/settings.md`: Settings tab on Sources with Engines, Budgets and Data policy, all outside calls off by default.
- Links added in UX, operations, web-ui (`GET` and `POST /api/settings`) and README.
- Decision D68 recorded and indexed. No model chosen: Q4, Q25 and vantage-h8fv stay open.
