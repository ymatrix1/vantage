---
# vantage-79lc
title: Session names, Asked evidence and Open in Claude
status: completed
type: feature
priority: normal
created_at: 2026-10-15T13:27:11Z
updated_at: 2026-10-15T13:32:01Z
---

## Context
User feedback: sessions show as 'session 981b84ab'. Needs names, a meaningful Asked line, and an Open in Claude action. Blocked by: none (stacked on PR #77 for Detail/Row files).

## Higher Goal
Track reads like the user's own work, not ids.

## Acceptance Criteria
- [x] Session name from transcript custom-title / agent-name, else request title, else short fallback; precedence kept (D110-D112)
- [x] Detail lists sessions by name; Track groupable by branch
- [x] Asked line: session name, anchor type and value, absolute and relative time
- [x] Open in Claude: copy 'cd + claude --resume <full id>' (no session-id deep link exists)
- [x] Docs, decisions D191-D193, tests

## Out of Scope
Raw prompt text; new URL schemes.

## Summary of Changes

Migration 0012 `session_names`; transcript `custom-title`/`agent-name` capture; item title and detail use names; Asked line per D192; Open in Claude copies the resume command (D193, no session-id deep link exists); `group=branch`. Tests: session-name, session-names (core, daemon, ui), track-v2.
