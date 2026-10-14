---
# vantage-d28s
title: Set up the real npm publish for the native hook packages
status: draft
type: task
created_at: 2026-10-14T19:26:53Z
updated_at: 2026-10-14T19:26:53Z
parent: vantage-fmfh
blocked_by:
    - vantage-bfr1
---

## Context

Split from vantage-bfr1. Needs the user: the npm scope that owns the @vantage/hook-* names, an npm-publish GitHub environment with required reviewers, and an NPM_TOKEN secret. Blocked by: vantage-bfr1. Left unconfigured on purpose.

## Higher Goal

Never slow an agent down.

## Acceptance Criteria

- [ ] npm scope and package names confirmed
- [ ] npm-publish environment and NPM_TOKEN configured by the user
- [ ] First real publish via manual dispatch of release-native

## Out of Scope

Changing the hook.
