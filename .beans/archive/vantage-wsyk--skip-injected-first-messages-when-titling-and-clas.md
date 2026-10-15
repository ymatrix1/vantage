---
# vantage-wsyk
title: Skip injected first messages when titling and classifying
status: completed
type: bug
created_at: 2026-10-15T13:37:27Z
updated_at: 2026-10-15T13:37:27Z
---

## Context
Rows titled 'You are operating in a git worktree' (Claude Code's injected notice taken as the first prompt). Blocked by: none.

## Higher Goal
Titles come from what the person wrote.

## Acceptance Criteria
- [x] Injected messages (worktree notice, system reminder, command wrappers, hook output, notifications) are never a title or classifier input (D194)
- [x] Worktree folder names never title an item
- [x] Stored bad titles repaired once
- [x] Regression tests per pattern

## Out of Scope
Search in session text (vantage-81ok).

## Summary of Changes
`userRequestText` in core, used by firstRequestTitle and the classifier; repair of stored titles; worktree item without branch uses the fallback title. Tests: core injected-text, daemon session-names, classify.
