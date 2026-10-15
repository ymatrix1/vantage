---
# vantage-7r7l
title: 'Proof commands: quote-aware segments, read-only commands are not checks'
status: completed
type: bug
created_at: 2026-10-15T00:09:54Z
updated_at: 2026-10-15T00:09:54Z
parent: vantage-fmfh
---

## Context

Blocked by: none. On the real page a proof "L1 weak (before-build)" had a command that only grepped: `splitSegments` in `stage.ts` split on `|`, `;` and `&&` even inside quotes, so the pattern `"check_docs\|unittest"` produced a segment starting with `unittest"`, which matched the runner allowlist. A wrongly counted proof also hides real missing proof.

## Higher Goal

A card moves only on evidence (D3): a grep is not a test run.

## Acceptance Criteria

- [x] Quote-aware segmentation (quotes, backslashes, backticks, `$(...)`, here-doc bodies skipped), shared with `shell.ts`.
- [x] A segment starting with a read-only command never counts as a check; `time`, `env VAR=x`, `VAR=x` and `cd x &&` prefixes still work.
- [x] Regression tests of the real shape that fail before the fix, plus the existing runner cases.

## Out of Scope

Changing the runner allowlist (D71, accepted); parsing `( )` groups; counting affected items on real data (the user's machine only).

## Summary of Changes

`splitCommandSegments` in `shell.ts` (quote, backslash, backtick, `$(...)` and here-doc aware) replaces the naive split in `stage.ts`; read-only first words are never checks; `time`, `env` and `nohup` prefixes are skipped. 37 new tests, 6 of which fail on the old code. Spec: proof.md, Recognizing the command.
