---
# vantage-5rgr
title: 'Flag left_unfinished: work left when a conversation stops or is archived'
status: draft
type: feature
created_at: 2026-10-15T00:20:19Z
updated_at: 2026-10-15T00:20:19Z
parent: vantage-nqh6
---

## Context

Pain P13 (PRD): the Claude desktop app archived the author's sessions when their PR merged while follow-ups remained (setting auto_archive_on_pr_close, now off). Vantage should say what is left. Signals we already have: the agent's task list with open items (PR #61), unproven code edits (stage machine), open flags. The app does not report archives to any hook, so Vantage infers (Q32). Blocked by: none.

## Higher Goal

No conversation ends with the next step forgotten.

## Acceptance Criteria

- [ ] Flag left_unfinished (amber) in packages/core: raised when a session is stopped or quiet for N minutes (default 30) and its item has open tasks, an unproven code edit or an open flag; cleared when the work is done or the user dismisses it
- [ ] Reason in words (for example '3 tasks left: next is X', 'edited foo.ts, no check since'), with the next task capped at 80 characters
- [ ] Primary action Resume with context: copies a short resume brief (item title, what is left, branch, worktree path) with no transcript text
- [ ] Shown on the Track page and in the item expand; counted in vantage stats
- [ ] Tests with a fake clock for each trigger and for clearing; a precision check on real data as aggregates only
- [ ] Q32 answered or documented: whether the app exposes archive state locally

## Out of Scope

Changing the app's archive behaviour (the user's setting is already off); un-archiving sessions.

## Summary of Changes

TBD
