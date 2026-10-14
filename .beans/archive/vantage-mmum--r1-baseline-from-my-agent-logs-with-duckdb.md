---
# vantage-mmum
title: 'R1: baseline from my agent logs with DuckDB'
status: completed
type: task
priority: high
tags:
    - research
created_at: 2026-10-14T01:11:44Z
updated_at: 2026-10-14T13:41:53Z
parent: vantage-pdgc
---


## Context

PRD success metrics and pain ranking have no baseline. About 260 Claude Code projects and Codex sessions exist locally. Blocked by: none.

## Higher Goal

Rank the pains by real numbers and validate the boundary rules (D25) before building.

## Acceptance Criteria

- [x] Share of sessions that end with edits and no qualifying proof after the last edit
- [x] Count and rate of thrash loops (3+ edit then failing command cycles)
- [x] Sessions with requests but no edits (ghost candidates)
- [x] Abandoned dirty worktrees
- [x] Share of sessions that map to an issue key, a branch or worktree, or neither
- [x] Findings in docs/research/baseline.md as aggregates only; queries kept outside the repo or scrubbed

## Out of Scope

Review metrics (see R4). Any raw transcript content in the repo.

## Summary of Changes

Measured 461 Claude Code sessions (90 days) and 5 Codex sessions with DuckDB; scratch queries kept outside the repo. Added docs/research/baseline.md (aggregates only): 43.5% of edit sessions end unproven, 17 dirty worktrees idle 7+ days, 17.8% strict ghost candidates, 2.0% thrash. Updated Q1, Q2, Q3, Q11 in docs/OPEN-QUESTIONS.md and added proposals P1 (gate skips docs-only), P2 (branch at event time), P3 (thrash reset rule) to docs/DECISIONS.md. Follow-ups: re-measure on hook data, label a ghost sample, include subagent transcripts.
