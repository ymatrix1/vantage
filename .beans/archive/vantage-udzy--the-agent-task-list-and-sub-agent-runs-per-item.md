---
# vantage-udzy
title: The agent task list and sub-agent runs per item
status: completed
type: feature
created_at: 2026-10-15T00:06:42Z
updated_at: 2026-10-15T00:06:42Z
parent: vantage-fmfh
---

## Context

Claude Code records the agent task list (TodoWrite) and sub-agent runs. Blocked by: none. Measured: TodoWrite in 0 of 521 sessions, 730 sub-agent runs in 119 sessions (docs/research/session-lineage.md).

## Higher Goal

A card shows what the agent is doing and how much of its plan is done, from evidence it already recorded.

## Acceptance Criteria

- [x] Measure on the real data (aggregates only)
- [x] `task.list.updated` keeps counts and one cleaned current task (80 characters), never the full todo texts
- [x] `subagent.run` slices, summed per agent by the read model
- [x] Per-item `tasksTotal`, `tasksDone`, `currentTask`, `subagentRuns` readable from the store, tested from the previous schema version
- [x] Text capture can be switched off

## Out of Scope

- Track API and UI (`track.ts`, `api.ts`, `packages/ui`)
- `TaskCreate` and `TaskUpdate`
- Sub-agent run descriptions

## Summary of Changes

- `task.list.updated` (from `TodoWrite`: counts and the cleaned current task, 80 characters) and `subagent.run` (slices per sub-agent file and batch), `cleanTaskText`, `todoCounts` in core.
- Migration 7: `item_tasks` view and the extended `item_sessions` view; `itemTasks` and `itemSessionCounts` in the daemon return `tasksTotal`, `tasksDone`, `currentTask`, `subagentRuns`, `subagentTools`.
- `store.captureTaskText` is the text switch (default on); wiring to `item_titles_from_requests` follows PR #56.
- Proposed D96; research, ingestion, work-item-model, data-schema, ROADMAP.
