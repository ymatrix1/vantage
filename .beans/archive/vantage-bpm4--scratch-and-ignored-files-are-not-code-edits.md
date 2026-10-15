---
# vantage-bpm4
title: Scratch and ignored files are not code edits
status: completed
type: bug
created_at: 2026-10-15T00:31:42Z
updated_at: 2026-10-15T00:31:42Z
parent: vantage-fmfh
---

## Context

Blocked by: none. On the real page, reasons read "Session stopped after editing daemon.log without proof": scratch files (logs, temp output, ignored files) are counted as code edits, so they expire proof and raise `unproven_claim` and `thrashing`. D70 only separates in-repo from outside-repo writes.

## Higher Goal

A card moves only on evidence (D3): a log file is not a code change, and a wrong "unproven" flag hides real ones.

## Acceptance Criteria

- [x] An edit whose paths are all scratch (a lexical scratch kind, or git-ignored in its repo) is not a code or documentation edit: it does not move stage, expire proof, or raise `unproven_claim` or `thrashing`.
- [x] Git is asked in batches (`ls-files`, `check-ignore`) and cached with a bound; with no git, a bad path or a relative path, only the lexical list applies; anything unclassified keeps counting as code.
- [x] The edit is not lost: the item records `scratchEdits` and the scratch file names.
- [x] Tests with real temporary git repos: tracked, ignored, untracked source, log, tmp, no git, bad path; docs and a proposed decision.

## Out of Scope

Guessing that an untracked, not-ignored file is throwaway (`docs2.py` still counts as code); a files list in the UI; reclassifying stored events (the stage pass recomputes from events, so nothing is stored).

## Summary of Changes

core: `scratch.ts` (name rules), `StageOptions.scratchPaths` and `repoRelative`, `ItemState.scratchEdits` and `scratchFiles`; scratch-only edits skip stage, proof expiry, thrash cycles and claims. daemon: `scratch.ts` (repo lookup, batched `git check-ignore`, 5-minute bounded cache, never throws), used by the stage pass (`gitScratch: false` turns it off). Tests with real temp git repos. Docs: ingestion, proof, ROADMAP, proposed D140.
