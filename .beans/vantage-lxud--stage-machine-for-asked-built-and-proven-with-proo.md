---
# vantage-lxud
title: Stage machine for Asked, Built and Proven with proof expiry
status: todo
type: feature
priority: high
tags:
    - phase-1
created_at: 2026-10-14T14:23:32Z
updated_at: 2026-10-14T14:23:32Z
parent: vantage-fmfh
blocked_by:
    - vantage-9xbi
---

## Context

Cards move only on evidence (D3). Proof is L1 at first, with fingerprints so later edits expire it (D4, D28). Docs-only sessions are skipped (D53). Blocked by: the linker.

## Higher Goal

The core rule of A2V, enforced in code.

## Acceptance Criteria

- [ ] Asked, Built, Proven gates per docs/specs/lifecycle.md
- [ ] Proof records with type, level L1 and code fingerprint; expiry on later linked edits (docs/specs/proof.md)
- [ ] Fake proof detection: 0 tests run, all skipped, commands that can't fail
- [ ] Docs-only sessions don't need proof (D53); thrashing per D55
- [ ] Every change traceable ("why did this change?", D45)

## Out of Scope

Reviewed, Shipped, Verified.

## Summary of Changes

TBD
