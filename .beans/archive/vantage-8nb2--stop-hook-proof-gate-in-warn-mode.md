---
# vantage-8nb2
title: Stop hook proof gate in warn mode
status: completed
type: feature
priority: high
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T19:09:40Z
parent: vantage-fmfh
blocked_by:
    - vantage-lxud
---

## Context

The top pain is ending without proof (R1). The Stop gate warns when linked edits have no fresh proof; contract per D60. Blocked by: the stage machine.

## Higher Goal

Catch unproven claims at the moment they happen.

## Acceptance Criteria

- [x] Warn: exit 0 with systemMessage naming the files and missing proof (D60)
- [x] Never exit 1; block is a configurable mode, off by default and not wired (exit 2 is a follow-up bean, Q11)
- [x] Synchronous and fast enough for the Stop hook; tested
- [x] unproven_claim flag raised (via vantage-cji5)

## Out of Scope

Block mode as a default (Q11).

## Summary of Changes

`packages/hooks/src/gate.ts`: read-only gate over the daemon's derived tables, modes off and warn (block parsed, renders as warn), silent on any doubt, docs-only and `stop_hook_active`. `bin.ts` runs it only for `Stop`; `hooksSettings` registers `Stop` synchronously. Tests in `packages/hooks/test/gate.test.ts` cover unproven, proven, docs-only, expired, failed, weak, daemon down, loop safety and the real command. Proposed D73. Follow-ups: block wiring, gate lag.
