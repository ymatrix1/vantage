---
# vantage-p9x2
title: Install with a prompt and vantage add
status: todo
type: feature
priority: normal
tags:
    - phase-1
created_at: 2026-10-14T14:23:33Z
updated_at: 2026-10-14T14:23:33Z
parent: vantage-fmfh
blocked_by:
    - vantage-3vuw
    - vantage-in31
    - vantage-8nb2
    - vantage-p9at
    - vantage-olgf
---

## Context

Install must be one command or one prompt (D50, D52, D63). Blocked by: collector, git scanner, gate, status line and Track page.

## Higher Goal

Anyone (starting with the owner on a fresh machine) can set up Vantage in minutes, safely.

## Acceptance Criteria

- [ ] npx vantage add with --dry-run, hook chaining for Husky and Lefthook, and vantage remove and uninstall
- [ ] vantage doctor checks hooks, spool, daemon, database and sources
- [ ] docs/install-for-agents.md works end to end in Claude Code and Codex on a fresh machine

## Out of Scope

Publishing releases to npm (later).

## Summary of Changes

TBD
