---
# vantage-ibuz
title: 'R10: judgment model comparison (Jev vs small LLM vs rules)'
status: todo
type: task
priority: low
tags:
    - research
created_at: 2026-10-14T01:11:45Z
updated_at: 2026-10-14T01:11:45Z
parent: vantage-pdgc
blocked_by:
    - vantage-mmum
---

## Context

Fuzzy yes/no checks (does this command exercise the changed code, is this a commitment) need a judge (Q4). Needs labeled examples from R1 and the data policy decision. Blocked by: vantage-mmum.

## Higher Goal

Choose the judge on measured accuracy, cost and latency.

## Acceptance Criteria

- [ ] About 100 labeled examples per question, scrubbed
- [ ] Accuracy, latency and cost for Jev, a small Claude model, and rules
- [ ] Data policy check before sending anything out
- [ ] Findings in docs/research/judgment-model.md

## Out of Scope

Building the judge layer.

## Summary of Changes

TBD
