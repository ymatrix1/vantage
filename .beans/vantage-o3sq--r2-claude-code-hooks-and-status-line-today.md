---
# vantage-o3sq
title: 'R2: Claude Code hooks and status line, today'
status: todo
type: task
priority: high
tags:
    - research
created_at: 2026-10-14T01:11:44Z
updated_at: 2026-10-14T01:11:44Z
parent: vantage-pdgc
---

## Context

Phase 1 depends on hook payloads and behaviour that change between versions. Blocked by: none.

## Higher Goal

Design the event spine and proof gate on verified hook behaviour.

## Acceptance Criteria

- [ ] Payload shape for SessionStart, PostToolUse, Notification, Stop, PreCompact
- [ ] Whether a permission prompt or question fires Notification
- [ ] Stop hook exit-code semantics for warn vs block
- [ ] Status line command API and refresh behaviour
- [ ] Whether hooks run for Claude desktop app (Code tab) sessions
- [ ] Claude Code OpenTelemetry export to a local OTLP receiver: which metrics and events, and whether it is useful as a source
- [ ] Findings in docs/research/claude-code-hooks.md with version and date

## Out of Scope

Building the collector.

## Summary of Changes

TBD
