---
# vantage-7ouh
title: Ignore scratch-file shell writes when counting edits
status: todo
type: task
priority: low
created_at: 2026-10-14T18:20:45Z
updated_at: 2026-10-14T18:20:45Z
parent: vantage-fmfh
---

## Context

Blocked by: none. Sampling in docs/research/shell-edit-precision.md found about half of flagged shell writes only name log, output or data files, and some sed -i targets sit outside the repo. They are real writes but not work-item edits.

## Higher Goal

Cards move only on evidence: edits must be work on the item.

## Acceptance Criteria

- [ ] At ingest, classify a shell write target as in-repo or not using the session cwd
- [ ] Only in-repo writes count as file.edited; test with synthetic cases

## Out of Scope

Detecting writes through non-shell tools.
