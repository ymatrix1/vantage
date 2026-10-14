---
# vantage-p9x2
title: Install with a prompt and vantage add
status: completed
type: feature
priority: normal
tags:
    - phase-1
created_at: 2026-10-14T14:23:33Z
updated_at: 2026-10-14T20:04:37Z
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

- [x] vantage add with --dry-run, backup, idempotency, chaining for Lefthook and plain hooks (Husky is detected; it bypasses a global hooksPath, see D79), and vantage remove and uninstall. The npx entry waits for the npm package (vantage-o06l)
- [x] vantage doctor checks hooks, spool, daemon, database and sources
- [ ] docs/install-for-agents.md works end to end in Claude Code and Codex on a fresh machine (guide updated for Claude Code; the fresh-machine run and Codex are vantage-o06l)

## Out of Scope

Publishing releases to npm (later).

## Summary of Changes

`packages/cli/src/install.ts` (add, remove, uninstall, pure merge and strip of settings, repos in config.toml, opt-in git hook wrappers) and `doctor.ts`, wired in `cli.ts`; `resolveHookCommands` is the single place that picks the hook command. Marker `--vantage-managed`, manifest, backup, confirmation. Tests in `packages/cli/test/install.test.ts`, all in temp directories. Guide, first-run, operations, status-line and ROADMAP updated; proposed D79. Not done: fresh-machine run, Codex, npx (vantage-o06l).
