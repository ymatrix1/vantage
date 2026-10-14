---
# vantage-7xb3
title: 'R13b: Explain follow-ups (Codex exec, limit behavior, layer 3 prototype)'
status: todo
type: task
created_at: 2026-10-14T13:57:37Z
updated_at: 2026-10-14T13:57:37Z
parent: vantage-pdgc
---

## Context

R13 (vantage-2vum) measured claude -p (20/20 valid) but could not test Codex (not installed), behavior at a plan limit, or an end-to-end layer 3 flow. See docs/research/explain-engine.md. Blocked by: none.

## Higher Goal

Close the gaps left by R13 before building Explain layers 3 and 4.

## Acceptance Criteria

- [ ] codex exec --output-schema on the same synthetic item, about 20 runs: latency, validity, citations
- [ ] claude -p and codex exec behavior when a plan limit is hit (observed, not forced)
- [ ] Layer 3 prototype: skill plus MCP get_facts/put_blocks in Claude Code and Codex; validity and latency
- [ ] Re-test with evidence-id enum schema and Vantage-built status tree
- [ ] Findings added to docs/research/explain-engine.md

## Out of Scope

Building the renderer.

## Summary of Changes

TBD
