---
# vantage-of25
title: Cut hook cold-start latency under 100 ms
status: completed
type: task
priority: low
created_at: 2026-10-14T17:17:14Z
updated_at: 2026-10-14T17:42:22Z
parent: vantage-fmfh
---

## Context
Blocked by: none. Owns the unticked "cold start under 100 ms" box left open in vantage-3vuw (PR #10). A cold node start measured about 215 ms on the dev laptop, above the 100 ms hook budget (ingestion principle 3). Hooks are async (D59), so the agent is not blocked; the cost is a short-lived process per hook.

## Higher Goal
Never slow an agent down.

## Acceptance Criteria
- [x] Measure cold-start of node bin.ts against a leaner launcher (compiled binary or socket write to the daemon), 10 runs each, same setup
- [x] Pick one, record the numbers and the decision (D-entry)
- [x] Hook test asserts the chosen launcher exits 0 with the daemon down

## Out of Scope
Changing which events are collected.

## Summary of Changes

- Measured 6 launchers, 40 interleaved runs each. Before `node src/bin.ts`: median 126 to 133 ms, p95 167 to 181 ms. After built JS `node dist/src/bin.js`: median 95 to 99 ms, p95 130 ms. Node floor 82 ms; Go spike 33 ms; Bun compiled 114 to 117 ms.
- Hook test now runs the built command: exit 0 with no daemon, spool line written, CI ceiling 750 ms median. `pnpm test` runs `tsc -b` first.
- D67 records the choice. Docs: ingestion spec "Hook latency", ROADMAP, Q28.
- Not met: p95 is 130 ms and the median is only just under 100 ms. A native binary is needed to clear it; follow-up bean opened.
