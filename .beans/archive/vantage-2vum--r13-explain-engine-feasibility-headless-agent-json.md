---
# vantage-2vum
title: 'R13: Explain engine feasibility (headless agent, JSON schema)'
status: completed
type: task
priority: normal
tags:
    - research
created_at: 2026-10-14T02:11:21Z
updated_at: 2026-10-14T13:58:52Z
parent: vantage-pdgc
---


## Context

Explain (D37) runs the user's connected agent headless, for example claude -p with JSON output and a schema. Speed, cost, reliability and subscription limits are untested. Blocked by: none.

## Higher Goal

Know Explain can work on tools the user already pays for before designing around it.

## Acceptance Criteria

- [x] Run claude -p with a JSON schema on a synthetic item: latency and output validity over 20 runs (20/20 valid; p50 52.5 s, p95 76.2 s)
- [x] Usage against subscription limits; behavior when limits are hit (usage measured: about 5.5k output tokens a run. Limit-hit behavior not observed; deferred to `vantage-7xb3` and Q27)
- [x] Codex equivalent checked (`codex exec`) (docs only: `--output-schema` exists. Codex isn't installed, so no runs; deferred to `vantage-7xb3`)
- [x] In-session flow: a slash command that reads facts and returns blocks through MCP, in Claude Code and Codex (mechanism and limits documented from the docs; prototype deferred to `vantage-7xb3`)
- [x] Current vendor policy on billing for headless use
- [x] Fallback confirmed (plain status tree when the agent fails) (failure signals probed: unknown model, not logged in, invalid schema; fallback order specified)
- [x] Findings in docs/research/explain-engine.md

## Out of Scope

Building the renderer.

## Summary of Changes

- Ran 20 `claude -p` calls (Haiku, `--json-schema`) on a synthetic item. All 20 were schema-valid. Wall time p50 was 52.5 s and p95 76.2 s. Of 640 citations, none used an unknown id; 8 cited the target's own id. The headline status varied between runs (`waiting` 9, `at_risk` 8, `blocked` 3).
- Probed failures: an unknown model and a missing login both exit 1 with `is_error`; an invalid schema was accepted silently.
- From the docs: vendor policy as of 2026-10-14 (Anthropic paused the separate billing; plan limits apply) and the layer 3 mechanism (skill plus MCP) for Claude Code and Codex.
- Wrote `docs/research/explain-engine.md`, updated `docs/specs/explain.md`, added proposals P5 and P6 to DECISIONS and Q27 to OPEN-QUESTIONS.
- Not tested: Codex runs, behavior at a plan limit, a layer 3 prototype. All three moved to `vantage-7xb3`.
