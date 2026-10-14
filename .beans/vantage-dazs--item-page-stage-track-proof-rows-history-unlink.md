---
# vantage-dazs
title: 'Item page: stage track, proof rows, history, unlink'
status: draft
type: feature
created_at: 2026-10-14T20:10:26Z
updated_at: 2026-10-14T20:10:26Z
parent: vantage-nqh6
---

## Context

The Track page lists items; there is no page for one item (docs/UX.md Item, web-ui.md). Phase 1 gives stage transitions, proofs, flags and the item trace API (GET /api/items/:id/trace). The linker's undo exists in the store (undoLink) but has no UI. Blocked by: none.

## Higher Goal

Open any row and see why it is where it is, with evidence, and fix a wrong link.

## Acceptance Criteria

- [ ] Item page from any Track row: title, stage track, flags, proof rows (type, level, last run, command, state: fresh, expired, failed, weak) with expired and failed proofs kept in a history list
- [ ] History strip of events by day and session, from stage changes and linked events
- [ ] Unlink action (records a user action, never re-creates the link) with a test
- [ ] Read-only API additions follow D75 (token, Host, Origin); component tests for each state

## Out of Scope

Behaviors rows, decisions, review threads, after-ship, relationship graph, Explain, Resume with context (later phases).

## Summary of Changes

TBD
