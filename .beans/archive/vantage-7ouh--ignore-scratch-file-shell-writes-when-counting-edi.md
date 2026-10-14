---
# vantage-7ouh
title: Ignore scratch-file shell writes when counting edits
status: completed
type: task
priority: low
created_at: 2026-10-14T18:20:45Z
updated_at: 2026-10-14T18:34:46Z
parent: vantage-fmfh
---

## Context

Blocked by: none. Sampling in docs/research/shell-edit-precision.md found about half of flagged shell writes only name log, output or data files, and some sed -i targets sit outside the repo. They are real writes but not work-item edits.

## Higher Goal

Cards move only on evidence: edits must be work on the item.

## Acceptance Criteria

- [x] At ingest, classify a shell write target as in-repo or not using the session cwd
- [x] Only in-repo writes count as file.edited; test with synthetic cases

## Out of Scope

Detecting writes through non-shell tools.

## Summary of Changes

- `packages/core/src/paths.ts`: lexical `pathMembership` (separators, `.`/`..`, Windows drive and case, Git Bash `/c/...`).
- `shell.ts`: `classifyWrites` splits targets into in-repo and outside; `claude-code.ts` emits `file.edited` for in-repo only and records `outsidePaths` / `opaqueOutsideRepo` on `command.ran`.
- Targets that can't be resolved, a missing cwd and commands with `cd` still count (no silent loss of real edits).
- Specs: ingestion.md, work-item-model.md; decision D70; research note updated.
- Follow-up: vantage-1ulu (daemon passes `repoRoot`; until then the root is the cwd).
