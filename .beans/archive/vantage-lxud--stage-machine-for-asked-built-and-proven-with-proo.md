---
# vantage-lxud
title: Stage machine for Asked, Built and Proven with proof expiry
status: completed
type: feature
priority: high
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T18:37:28Z
parent: vantage-fmfh
blocked_by:
    - vantage-9xbi
---

## Context

Cards move only on evidence (D3). Proof is L1 at first, with fingerprints so later edits expire it (D4, D28). Docs-only sessions are skipped (D53). Blocked by: the linker.

## Higher Goal

The core rule of A2V, enforced in code.

## Acceptance Criteria

- [x] Asked, Built, Proven gates per docs/specs/lifecycle.md
- [x] Proof records with type, level L1 and code fingerprint; expiry on later linked edits (docs/specs/proof.md)
- [x] Fake proof detection for commands that can't fail (`|| true`, `; exit 0`), `--passWithNoTests` and checks before any code change
- [x] Docs-only sessions don't need proof (D53); thrashing per D55
- [x] Every change traceable ("why did this change?", D45)

## Out of Scope

Reviewed, Shipped, Verified. Zero-test and all-skipped detection (needs hook output capture, moved to `vantage-ci4u`).

## Summary of Changes

- `packages/core/src/stage.ts`: pure `computeStages(events, links, opts)` returning per-item stage (Asked, Built, Proven), proof records (type, L1 or L2, fresh, expired, failed, weak, fingerprint), transitions with the causing event, and flags `unproven_claim`, `thrashing`, `forgotten`.
- `packages/daemon/src/stages.ts`: `runStagePass` (link, replay, persist), and the read side `listItems`, `getItem`, `dismissFlag` for the Stop gate, status line and Track page. `stage-loop.ts`: the scheduled pass (30 s).
- Migration 3 adds `work_items`, `proofs`, `flags`, `stage_changes`; a test upgrades a version 2 database.
- D71 records the rules the specs left open; proof spec, data schema and ROADMAP updated.
- 42 core tests and 11 daemon tests, including ambiguous, unlinked, undone and thrashing cases.
- Split out: `vantage-ci4u` (output summary for zero-test detection), `vantage-cji5` (emit `session.stopped`).
