---
# vantage-2vum
title: 'R13: Explain engine feasibility (headless agent, JSON schema)'
status: todo
type: task
priority: normal
tags:
    - research
created_at: 2026-10-14T02:11:21Z
updated_at: 2026-10-14T02:11:21Z
parent: vantage-pdgc
---

## Context

Explain (D37) runs the user's connected agent headless, for example claude -p with JSON output and a schema. Speed, cost, reliability and subscription limits are untested. Blocked by: none.

## Higher Goal

Know Explain can work on tools the user already pays for before designing around it.

## Acceptance Criteria

- [ ] Run claude -p with a JSON schema on a synthetic item: latency and output validity over 20 runs
- [ ] Usage against subscription limits; behavior when limits are hit
- [ ] Codex equivalent checked (`codex exec`)
- [ ] In-session flow: a slash command that reads facts and returns blocks through MCP, in Claude Code and Codex
- [ ] Current vendor policy on billing for headless use
- [ ] Fallback confirmed (plain status tree when the agent fails)
- [ ] Findings in docs/research/explain-engine.md

## Out of Scope

Building the renderer.

## Summary of Changes

TBD
