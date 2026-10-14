---
# vantage-ct1g
title: Parse dbt test summaries into command.ran result
status: todo
type: task
created_at: 2026-10-14T19:35:21Z
updated_at: 2026-10-14T19:35:21Z
parent: vantage-fmfh
---

## Context

Split from vantage-ci4u. Blocked by: none. ci4u parses vitest, jest, pytest, go test and dotnet test; dbt test output (`Done. PASS=5 WARN=0 ERROR=0 SKIP=0 TOTAL=5`) is not yet recognised, so a dbt run of zero tests is not detected.

## Higher Goal

Fake proof detection per docs/specs/proof.md.

## Acceptance Criteria

- [ ] parseTestSummary reads the dbt summary line (pass, error, skip, total, zero) with synthetic tests

## Out of Scope

Other runners (cargo, mvn).
