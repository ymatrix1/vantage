---
# vantage-u1hk
title: 'vantage tour: guided terminal walkthrough and demo home'
status: in-progress
type: feature
created_at: 2026-10-15T00:24:37Z
updated_at: 2026-10-15T00:24:37Z
parent: vantage-fmfh
---

## Context

No onboarding exists. Newcomers need a no-network, terminal walkthrough with real examples and a safe sandbox to click around. Blocked by: none (links to the docs bean for the glossary wording only).

## Higher Goal

People understand and use Vantage from the first run without reading specs.

## Acceptance Criteria

- [ ] `vantage tour` with 8 steps, Enter to continue, --lang pt|en, --no-pause, --step N
- [ ] Tour text in one data file per language; tests assert every step in both
- [ ] `vantage tour --demo`: temp synthetic home (~12 invented items), daemon on a free port, URL with token fragment, cleanup on exit
- [ ] Demo never reads or writes the real VANTAGE_HOME (tested)
- [ ] `vantage add` ends with a 'New here? Run vantage tour' line
- [ ] first-run spec, ROADMAP, README, install-for-agents updated; UI first-run text specified for the Track UI session
- [ ] pnpm check, check_docs.py and unit tests pass after the last edit

## Out of Scope

Editing packages/ui. Network use. Real data in the demo.

## Summary of Changes

TBD
