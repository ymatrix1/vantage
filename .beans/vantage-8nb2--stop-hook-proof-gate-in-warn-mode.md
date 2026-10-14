---
# vantage-8nb2
title: Stop hook proof gate in warn mode
status: todo
type: feature
priority: high
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T14:23:32Z
parent: vantage-fmfh
blocked_by:
    - vantage-lxud
---

## Context

The top pain is ending without proof (R1). The Stop gate warns when linked edits have no fresh proof; contract per D60. Blocked by: the stage machine.

## Higher Goal

Catch unproven claims at the moment they happen.

## Acceptance Criteria

- [ ] Warn: exit 0 with systemMessage naming the files and missing proof (D60)
- [ ] Never exit 1; block mode exists but is off by default
- [ ] Synchronous and fast enough for the Stop hook; tested
- [ ] unproven_claim flag raised

## Out of Scope

Block mode as a default (Q11).

## Summary of Changes

TBD
