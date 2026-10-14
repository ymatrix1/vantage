---
# vantage-bfr1
title: Ship the Rust spool hook in per-OS npm packages
status: in-progress
type: task
priority: low
created_at: 2026-10-14T18:50:58Z
updated_at: 2026-10-14T19:29:23Z
parent: vantage-fmfh
blocked_by:
    - vantage-xex6
---


## Context

Blocked by: vantage-xex6 (PR #20 must merge). D72 accepted 2026-10-14, so the bean is ready to start. Related: vantage-p9x2 (installer registers the path). Built JS hook is p95 118 to 147 ms; the Rust spike is median 26 to 33 ms, p95 44 to 52 ms, 0.16 MB ([research](../docs/research/native-hook-binary.md)).

## Higher Goal

Never slow an agent down.

## Acceptance Criteria

- [x] Rust crate in the repo (`packages/hooks-native`, promoted from tools/spike-native-hook), same {v, receivedAt, hook} line as packages/hooks/src/collect.ts, exit 0 on any error
- [x] Parity test: Rust and Node hooks write the same line shape; exit 0 with the daemon down and with an unwritable spool
- [x] Stop handling decided and documented (D76, proposed): native hands Stop to the Node entry, other events stay native
- [x] Release CI builds the 5 targets (win32-x64, darwin-arm64, darwin-x64, linux-x64, linux-arm64) and assembles one npm package per target, wired as optionalDependencies with os and cpu; the publish step is a dry run
- [ ] Real npm publish: split to vantage-d28s (needs the user's scope, environment and token)
- [ ] Installer resolves the binary path and registers it, falls back, doctor reports: split to vantage-ijmb
- [x] Windows: unsigned binary installed from the packed tarball with npm install, ran with exit 0, no Mark-of-the-Web stream on the file
- [ ] Defender scan and SmartScreen verdict: split to vantage-uegr (Defender is passive on the dev laptop, so no scan ran)
- [x] Latency re-measured with the built binary against the 100 ms p95 budget (median 29 ms, p95 36 ms); docs/specs/ingestion.md table updated

## Out of Scope

Changing which events are collected. Rewriting the daemon or CLI in Rust.

## Summary of Changes

- New crate `packages/hooks-native` (Cargo.lock committed, `preserve_order` on, 0.25 MB), parity test in vitest that skips without cargo and fails in CI.
- D76 (proposed) for Stop; ingestion latency table, ci spec and ROADMAP updated.
- `tools/assemble-native-packages.mjs` and `.github/workflows/release-native.yml` (dry run only); spike bench now measures the crate.
- Split beans: vantage-ijmb (installer), vantage-uegr (Defender), vantage-d28s (real publish).
