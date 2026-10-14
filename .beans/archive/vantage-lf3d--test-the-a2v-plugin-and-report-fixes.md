---
# vantage-lf3d
title: Test the A2V plugin and report fixes
status: completed
type: task
priority: normal
created_at: 2026-10-14T15:18:31Z
updated_at: 2026-10-14T15:19:18Z
---

## Context
The a2v plugin (plugin/a2v) ships a communication rule, an output style and three skills. Nobody has checked they load and behave as written. Blocked by: none.

## Higher Goal
A plugin that other projects can trust to enforce A2V habits.

## Acceptance Criteria
- [x] Loading checked for all pieces
- [x] explain-top-down, prove-it, record-decision exercised and scored against their own text
- [x] Communication rule checked across session answers
- [x] Report in docs/research/a2v-plugin-test.md with fixes and ambiguities
- [x] python tools/check_docs.py reports 0 problems

## Out of Scope
Changing plugin files.

## Summary of Changes

Added docs/research/a2v-plugin-test.md: per-piece test tables, 10 concrete fixes, 5 ambiguities. No plugin files changed.
