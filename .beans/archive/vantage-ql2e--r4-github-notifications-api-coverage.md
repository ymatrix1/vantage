---
# vantage-ql2e
title: 'R4: GitHub Notifications API coverage'
status: completed
type: task
priority: normal
tags:
    - research
created_at: 2026-10-14T01:11:45Z
updated_at: 2026-10-14T13:54:47Z
parent: vantage-pdgc
---



## Context

D22 makes the Notifications API the primary GitHub trigger; coverage is unverified. Blocked by: none.

## Higher Goal

Confirm the main GitHub trigger catches everything the Reviewed stage needs.

## Acceptance Criteria

- [x] Which reasons appear for: comments on my PRs, review requests, re-review requests, CI results, mentions
- [x] Behaviour for org repos with SSO
- [x] Poll interval and 304 behaviour observed
- [x] Review metrics from gh: review rounds per PR, time to first review
- [x] Findings in docs/research/github.md

## Out of Scope

Webhook relay.

## Summary of Changes

- Added `docs/research/github.md`: notification reasons and subject types observed over 909 threads, 304 and `X-Poll-Interval` behaviour, coverage tests against 913 authored PRs and 38 reviewed PRs, CI and SSO findings, 90-day review metrics (912 PRs), gaps and what to poll instead.
- Updated `docs/specs/ingestion.md` (GitHub row, polling budget, adapter rules), `docs/specs/lifecycle.md` (Reviewed sub-state derivation), `docs/specs/pings.md`.
- Added proposal P4 to `docs/DECISIONS.md` and Q26 to `docs/OPEN-QUESTIONS.md`.
- Not verified (recorded in the doc): event-to-bump delay, Done threads, SSO-blocked orgs, `ci_activity` with the web setting on.
