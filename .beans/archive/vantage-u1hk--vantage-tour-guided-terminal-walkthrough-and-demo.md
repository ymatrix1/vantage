---
# vantage-u1hk
title: 'vantage tour: guided terminal walkthrough and demo home'
status: completed
type: feature
priority: normal
created_at: 2026-10-15T00:24:37Z
updated_at: 2026-10-15T00:41:15Z
parent: vantage-fmfh
---

## Context

No onboarding exists. Newcomers need a no-network, terminal walkthrough with real examples and a safe sandbox to click around. Blocked by: none (links to the docs bean for the glossary wording only).

## Higher Goal

People understand and use Vantage from the first run without reading specs.

## Acceptance Criteria

- [x] `vantage tour` with 8 steps, Enter to continue, --lang pt|en, --no-pause, --step N
- [x] Tour text in one data file per language; tests assert every step in both
- [x] `vantage tour --demo`: temp synthetic home (~12 invented items), daemon on a free port, URL with token fragment, cleanup on exit
- [x] Demo never reads or writes the real VANTAGE_HOME (tested)
- [x] `vantage add` ends with a 'New here? Run vantage tour' line
- [x] first-run spec, ROADMAP, README, install-for-agents updated; UI first-run text specified for the Track UI session
- [x] pnpm check, check_docs.py and unit tests pass after the last edit

## Out of Scope

Editing packages/ui. Network use. Real data in the demo.

## Summary of Changes

Added packages/cli/src/tour/ (types, en.ts, pt.ts, demo.ts, tour.ts), the `tour` command and a `pause` seam in cli.ts and main.ts, a one-line pointer at the end of `vantage add`, 19 tests (packages/cli/test/tour.test.ts and install.test.ts), first-run and operations specs, ROADMAP, README, install-for-agents (the agent offers the tour), and D106 (proposed). The Track page's first-run text is specified in docs/specs/first-run.md for the Track UI session; packages/ui was not touched.
