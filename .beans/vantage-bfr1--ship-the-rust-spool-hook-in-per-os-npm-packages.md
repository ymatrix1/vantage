---
# vantage-bfr1
title: Ship the Rust spool hook in per-OS npm packages
status: todo
type: task
priority: low
created_at: 2026-10-14T18:50:58Z
updated_at: 2026-10-14T18:50:58Z
parent: vantage-fmfh
blocked_by:
    - vantage-xex6
---

## Context

Blocked by: vantage-xex6 (PR #20 must merge; D72 confirmed by the user). Related: vantage-p9x2 (installer registers the path). Built JS hook is p95 118 to 147 ms; the Rust spike is median 26 to 33 ms, p95 44 to 52 ms, 0.16 MB ([research](docs/research/native-hook-binary.md)).

## Higher Goal

Never slow an agent down.

## Acceptance Criteria

- [ ] Rust crate in the repo (promoted from tools/spike-native-hook), same `{v, receivedAt, hook}` line as `packages/hooks/src/collect.ts`, exit 0 on any error
- [ ] Parity test: Rust and Node hooks write the same line shape; exit 0 with the daemon down and with an unwritable spool
- [ ] Release CI builds the 5 targets (win32-x64, darwin-arm64, darwin-x64, linux-x64, linux-arm64) and publishes one npm package per target, wired as `optionalDependencies` with `os` and `cpu`
- [ ] Installer (vantage-p9x2) resolves the binary path and registers it; falls back to `node dist/src/bin.js` when none resolves; `vantage doctor` reports which is registered
- [ ] Windows: unsigned binary checked against Defender and SmartScreen after npm install; result recorded, signing decision made if flagged
- [ ] Latency re-measured with the shipped binary against the 100 ms p95 budget; docs/specs/ingestion.md hook latency table updated

## Out of Scope

Changing which events are collected. Rewriting the daemon or CLI in Rust.
