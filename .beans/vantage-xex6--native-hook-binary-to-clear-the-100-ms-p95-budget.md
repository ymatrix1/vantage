---
# vantage-xex6
title: Native hook binary to clear the 100 ms p95 budget
status: in-progress
type: task
priority: low
created_at: 2026-10-14T18:07:08Z
updated_at: 2026-10-14T18:31:09Z
parent: vantage-fmfh
---

## Context

Blocked by: none (vantage-of25 merged in PR #17). Built JS leaves the hook at a median 95 to 99 ms and p95 130 ms (D67); a Go spike measured 33 ms median, p95 47 ms. Decide whether a native binary is worth a toolchain and per-OS builds (Q28, conflicts with npm install D63).

## Higher Goal

Never slow an agent down.

## Acceptance Criteria

- [x] Rust spike measured next to the Go spike (median and p95, 40 interleaved runs, same machine and setup), binary size recorded
- [x] Distribution question answered: npm per-OS optional packages (D63 stays) vs a download on first run vs building from source; code signing and antivirus effects on Windows noted (antivirus behavior listed as untested)
- [x] Decision proposed (D69, Rust in per-OS npm packages with a Node fallback). **Ship decision not yet confirmed by the user:** the box that records it stays open until they confirm.
- [ ] Ship decision confirmed by the user
- [ ] If shipped: build, per-OS distribution and installer registration; test asserts exit 0 with daemon down

## Out of Scope

Changing which events are collected.

## Summary of Changes

Measured Go and Rust spool hooks against built JS (4 runs, 40 interleaved runs each after 3 warm-ups, spool on local disk). Median and p95: Rust 26 to 33 ms and 44 to 52 ms, 0.16 MB; Go 27 to 37 ms and 39 to 48 ms, 2.14 MB; built JS 91 to 119 ms and 118 to 147 ms. Spike code in `tools/spike-native-hook/` (not shipped, hook command unchanged). Findings in `docs/research/native-hook-binary.md`; D69 proposed in `docs/DECISIONS.md`; Q28 and the ROADMAP updated. Bean stays in progress until the user confirms D69; shipping it is a follow-up.
