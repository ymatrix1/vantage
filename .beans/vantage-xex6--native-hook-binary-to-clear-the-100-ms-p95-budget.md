---
# vantage-xex6
title: Native hook binary to clear the 100 ms p95 budget
status: draft
type: task
priority: low
created_at: 2026-10-14T18:07:08Z
updated_at: 2026-10-14T18:07:08Z
parent: vantage-fmfh
blocked_by:
    - vantage-of25
---

## Context

Blocked by: vantage-of25. Built JS leaves the hook at a median 95 to 99 ms and p95 130 ms (D67); a Go spike measured 33 ms median, p95 47 ms. Decide whether a native binary is worth a toolchain and per-OS builds (Q28, conflicts with npm install D63).

## Higher Goal

Never slow an agent down.

## Acceptance Criteria

- [ ] Decision recorded: ship a native binary or accept built JS
- [ ] If shipped: build, per-OS distribution and installer registration; test asserts exit 0 with daemon down

## Out of Scope

Changing which events are collected.
