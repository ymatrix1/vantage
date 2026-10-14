---
# vantage-2vdj
title: 'R2b: Claude Code hooks with a model turn'
status: todo
type: task
priority: normal
tags:
    - research
created_at: 2026-10-14T13:35:20Z
updated_at: 2026-10-14T13:35:20Z
parent: vantage-pdgc
---

## Context

R2 (vantage-o3sq) verified hook payloads from docs, but the local CLI could not authenticate, so no model turn ran. PostToolUse, Stop, Notification, PreCompact, status line and prompt hooks were not observed. Kit and method: docs/research/claude-code-hooks.md. Blocked by: none (needs the user to log in the CLI).

## Higher Goal

Confirm the event spine and proof gate on observed, not documented, behaviour.

## Acceptance Criteria

- [ ] Observed payload shapes for PostToolUse, PostToolUseFailure, Stop, Notification, PreCompact
- [ ] Stop warn (systemMessage) and block (exit 2) observed
- [ ] Notification type for a permission prompt and for AskUserQuestion
- [ ] Status line input and refresh observed; whether the Code tab shows it
- [ ] Prompt hook latency on Stop with a small model
- [ ] OTel token and cost metrics observed; whether user settings env enables OTel in the Code tab
- [ ] docs/research/claude-code-hooks.md updated

## Out of Scope

Building the collector.

## Summary of Changes

TBD
