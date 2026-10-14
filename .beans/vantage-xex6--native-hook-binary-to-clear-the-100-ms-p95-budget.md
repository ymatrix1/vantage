---
# vantage-xex6
title: Native hook binary to clear the 100 ms p95 budget
status: todo
type: task
priority: low
created_at: 2026-10-14T18:07:08Z
updated_at: 2026-10-14T18:21:38Z
parent: vantage-fmfh
---

## Context

Blocked by: none (vantage-of25 merged in PR #17). Built JS leaves the hook at a median 95 to 99 ms and p95 130 ms (D67); a Go spike measured 33 ms median, p95 47 ms. Decide whether a native binary is worth a toolchain and per-OS builds (Q28, conflicts with npm install D63).

## Higher Goal

Never slow an agent down.

## Acceptance Criteria

- [ ] Rust spike measured next to the Go spike (median and p95, 40 interleaved runs, same machine and setup), binary size recorded
- [ ] Distribution question answered: npm per-OS optional packages (D63 stays) vs a download on first run vs building from source; code signing and antivirus effects on Windows noted
- [ ] Decision recorded: ship a native binary (Go or Rust) or accept built JS
- [ ] If shipped: build, per-OS distribution and installer registration; test asserts exit 0 with daemon down

## Out of Scope

Changing which events are collected.
