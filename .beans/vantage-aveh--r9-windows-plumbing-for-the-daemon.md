---
# vantage-aveh
title: 'R9: Windows plumbing for the daemon'
status: todo
type: task
priority: low
tags:
    - research
created_at: 2026-10-14T01:11:45Z
updated_at: 2026-10-14T01:11:45Z
parent: vantage-pdgc
---

## Context

Operations spec assumes toasts, start at login, credential storage and SQLite bindings on Windows. Blocked by: none.

## Higher Goal

Confirm each operational piece works on Windows with Node before Phase 1.

## Acceptance Criteria

- [ ] Toast notifications from Node with an action
- [ ] Start at login options
- [ ] OS credential store library (keytar replacement)
- [ ] node:sqlite stability vs better-sqlite3
- [ ] Findings in docs/research/windows.md

## Out of Scope

macOS support.

## Summary of Changes

TBD
