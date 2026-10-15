---
# vantage-hft6
title: 'vantage classify: Haiku suggestions with bulk accept'
status: in-progress
type: feature
created_at: 2026-10-15T00:03:55Z
updated_at: 2026-10-15T00:03:55Z
parent: vantage-fmfh
---

## Context

The Track page shows hundreds of items with weak titles and no grouping, and there is no labelled data to tune rules. The user accepts sending a minimal summary through their own Claude Code (`claude -p`, Haiku) because Claude Code already receives their data. Model output is only a suggestion about titles and groupings (D57); status, stage, proof and flags stay evidence-only. Per-item acceptance is unworkable, so bulk accept with one-click batch undo is required. Hooks capture every Claude Code session, including `claude -p` runs, so a skip guard is essential.

Blocked by: none. Touches migrations (PR #55 merges last), `api.ts` and `stages.ts` only through small hunks.

## Higher Goal

Make the Track page readable with evidence-owned status and model-suggested text, without leaving the user's machine except through their own Claude Code, and without ever applying anything silently.

## Acceptance Criteria

- [ ] `vantage classify --dry-run` prints item count, payload size, call count and an exact sample payload; calls nothing
- [ ] `vantage classify` runs a background daemon job: 2 parallel calls, batches of about 20, daily cap, cache by content hash, 30 minute settle, failure gives no suggestion
- [ ] Settings `engines.classify.*` and data-policy switches default off
- [ ] Payload holds only the allowed fields (asserted from a fixture with secrets, paths, commands)
- [ ] `VANTAGE_SKIP=1` makes both hooks (Node and Rust) exit 0 without writing; a classifier run never produces events or items
- [ ] Output schema validated; status, stage, proof and flag fields ignored; invalid output gives no suggestion
- [ ] `suggestions` table; accepting a title sets the display title (source `classifier`, never over an issue, branch or worktree title); accepting a group creates an undoable inferred link
- [ ] Bulk accept: all, by confidence, by kind, by repo, preview first, one batch with one undo, dismiss-all, auto-accept off by default
- [ ] Agreement report with the deterministic anchors, aggregates only
- [ ] Suggestions UI component and API routes; mount instructions for the parent
- [ ] Docs: settings, classify spec, operations, README, ROADMAP, proposed decisions

## Out of Scope

- Other engines (Codex), explain layer 4, embeddings.
- Rebuilding the Track page (track-ui session).
- A run on the user's real database (parent only).

## Summary of Changes

(filled in at the end)
