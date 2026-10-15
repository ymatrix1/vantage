---
# vantage-hft6
title: 'vantage classify: Haiku suggestions with bulk accept'
status: completed
type: feature
priority: normal
created_at: 2026-10-15T00:03:55Z
updated_at: 2026-10-15T00:30:42Z
parent: vantage-fmfh
---

## Context

The Track page shows hundreds of items with weak titles and no grouping, and there is no labelled data to tune rules. The user accepts sending a minimal summary through their own Claude Code (`claude -p`, Haiku) because Claude Code already receives their data. Model output is only a suggestion about titles and groupings (D57); status, stage, proof and flags stay evidence-only. Per-item acceptance is unworkable, so bulk accept with one-click batch undo is required. Hooks capture every Claude Code session, including `claude -p` runs, so a skip guard is essential.

Blocked by: none. Touches migrations (PR #55 merges last), `api.ts` and `stages.ts` only through small hunks.

## Higher Goal

Make the Track page readable with evidence-owned status and model-suggested text, without leaving the user's machine except through their own Claude Code, and without ever applying anything silently.

## Acceptance Criteria

- [x] `vantage classify --dry-run` prints item count, payload size, call count and an exact sample payload; calls nothing
- [x] `vantage classify` runs a background daemon job: 2 parallel calls, batches of about 20, daily cap, cache by content hash, 30 minute settle, failure gives no suggestion
- [x] Settings `engines.classify.*` and data-policy switches default off
- [x] Payload holds only the allowed fields (asserted from a fixture with secrets, paths, commands)
- [x] `VANTAGE_SKIP=1` makes both hooks (Node and Rust) exit 0 without writing; a classifier run never produces events or items
- [x] Output schema validated; status, stage, proof and flag fields ignored; invalid output gives no suggestion
- [x] `suggestions` table; accepting a title sets the display title (source `classifier`, never over an issue, branch or worktree title); accepting a group creates an undoable inferred link
- [x] Bulk accept: all, by confidence, by kind, by repo, preview first, one batch with one undo, dismiss-all, auto-accept off by default
- [x] Agreement report with the deterministic anchors, aggregates only
- [x] Suggestions UI component and API routes; mount instructions for the parent
- [x] Docs: settings, classify spec, operations, README, ROADMAP, proposed decisions

## Out of Scope

- Other engines (Codex), explain layer 4, embeddings.
- Rebuilding the Track page (track-ui session).
- A run on the user's real database (parent only).

## Summary of Changes

- Core (`packages/core/src/classify.ts`): payload builder and stripping, schema, validator, batching, content hash.
- Daemon: migration 10 (`suggestions`, `suggestion_batches`, `classify_calls`); `classify-store` (preview token, bulk accept and dismiss, one undo per batch); `classify-job` (settle, cache, cap, 2 in flight, isolated `claude -p`); `classify-api` (`/api/classify/*`, POST only there); `classify-report`; `VANTAGE_SKIP` guard in both hooks plus an ingest guard; accepted titles survive stage passes (`title_source = classifier`); inferred links survive link passes and stay out of the stage machine, gate and status line.
- CLI: `vantage classify` (--dry-run, run, accept, dismiss, undo, status, report) and a Classifier section in `vantage stats`.
- UI: `Suggestions.svelte` + `classify-client.ts`; mount with `<Suggestions onchange={reload} />` above the Track list.
- Docs: classify spec, settings, operations, data schema, web UI, README, ROADMAP, D99 to D101 (proposed).
- Not done: a run on a real database (parent only); mounting the bar on the page (track-ui owns the page).
