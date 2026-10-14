---
# vantage-mmum
title: 'R1: baseline from my agent logs with DuckDB'
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

PRD success metrics and pain ranking have no baseline. About 260 Claude Code projects and Codex sessions exist locally. Blocked by: none.

## Higher Goal

Rank the pains by real numbers and validate the boundary rules (D25) before building.

## Acceptance Criteria

- [ ] Share of sessions that end with edits and no qualifying proof after the last edit
- [ ] Count and rate of thrash loops (3+ edit then failing command cycles)
- [ ] Sessions with requests but no edits (ghost candidates)
- [ ] Abandoned dirty worktrees
- [ ] Share of sessions that map to an issue key, a branch or worktree, or neither
- [ ] Findings in docs/research/baseline.md as aggregates only; queries kept outside the repo or scrubbed

## Out of Scope

Review metrics (see R4). Any raw transcript content in the repo.

## Summary of Changes

TBD
