---
# vantage-o3sq
title: 'R2: Claude Code hooks and status line, today'
status: completed
type: task
priority: high
tags:
    - research
created_at: 2026-10-14T01:11:44Z
updated_at: 2026-10-14T13:36:35Z
parent: vantage-pdgc
---


## Context

Phase 1 depends on hook payloads and behaviour that change between versions. Blocked by: none.

## Higher Goal

Design the event spine and proof gate on verified hook behaviour.

## Acceptance Criteria

- [x] Payload shape for SessionStart, PostToolUse, Notification, Stop, PreCompact
- [x] Whether a permission prompt or question fires Notification
- [x] Stop hook exit-code semantics for warn vs block
- [x] Status line command API and refresh behaviour
- [x] Whether hooks run for Claude desktop app (Code tab) sessions
- [x] Prompt-type hooks: whether a small model can make cheap yes/no judgments inside hooks on the user's plan
- [x] Claude Code OpenTelemetry export to a local OTLP receiver: which metrics and events, and whether it is useful as a source
- [x] Findings in docs/research/claude-code-hooks.md with version and date

## Out of Scope

Building the collector.

## Summary of Changes

- docs/research/claude-code-hooks.md: payload shapes, Notification types, Stop warn/block contract, status line API and refresh, Code tab hooks, prompt hooks, OTel to 127.0.0.1:4318, Windows hook latency. Claude Code 2.1.295, 2026-10-14.
- Observed locally: SessionStart and SessionEnd payloads, OTLP/HTTP JSON metrics and events, hooks running in Code tab sessions, hook process latency. Docs only (the CLI could not authenticate, so no model turn ran): PostToolUse, Stop, Notification, PreCompact, status line, prompt hooks. Follow-up: vantage-2vdj.
- Specs updated: ingestion, proof, status-line, operations. Proposals P7-P9 in DECISIONS; Q11 updated, Q28-Q29 added.
