---
# vantage-ql2e
title: 'R4: GitHub Notifications API coverage'
status: todo
type: task
priority: normal
tags:
    - research
created_at: 2026-10-14T01:11:45Z
updated_at: 2026-10-14T01:11:45Z
parent: vantage-pdgc
---

## Context

D22 makes the Notifications API the primary GitHub trigger; coverage is unverified. Blocked by: none.

## Higher Goal

Confirm the main GitHub trigger catches everything the Reviewed stage needs.

## Acceptance Criteria

- [ ] Which reasons appear for: comments on my PRs, review requests, re-review requests, CI results, mentions
- [ ] Behaviour for org repos with SSO
- [ ] Poll interval and 304 behaviour observed
- [ ] Review metrics from gh: review rounds per PR, time to first review
- [ ] Findings in docs/research/github.md

## Out of Scope

Webhook relay.

## Summary of Changes

TBD
