---
# vantage-8e10
title: Sub-agent run descriptions
status: todo
type: task
created_at: 2026-10-15T00:06:43Z
updated_at: 2026-10-15T00:06:43Z
parent: vantage-fmfh
---

## Context

The Agent tool input has a description (776 of 776 calls) that is not kept. The `item_titles_from_requests` switch is not wired to `store.captureTaskText` until PR #56 merges. Blocked by: PR #56.

## Higher Goal

Show what a sub-agent was asked to do, and one switch for all captured text.

## Acceptance Criteria

- [ ] Capture the description, cleaned and capped at 80 characters, under the same switch
- [x] Set `store.captureTaskText` from `item_titles_from_requests` at daemon start (done in the task-list PR once #56 merged)

## Out of Scope

- Full prompts

## Summary of Changes

(filled in when done)
