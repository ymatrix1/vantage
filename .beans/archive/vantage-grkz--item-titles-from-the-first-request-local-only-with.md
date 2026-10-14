---
# vantage-grkz
title: Item titles from the first request, local only, with off switch
status: completed
type: task
priority: normal
created_at: 2026-10-14T23:27:22Z
updated_at: 2026-10-14T23:35:47Z
parent: vantage-fmfh
blocked_by:
    - vantage-r0kv
---

## Context

Blocked by: PR #52 (`vantage-r0kv`, the fallback title and `has_edits`). Many items are untitled sessions on the default branch. The user decided (chat, 2026-10-14) that the first sentence of a session's first request may title its provisional item, stored locally only, with a switch and a way to see and clear it. This is a privacy trade-off the user accepted.

## Higher Goal

A Track row should say what the work was, so the morning catch-up needs no clicking, without any prompt text leaving the machine or spreading beyond the title.

## Acceptance Criteria

- [x] First sentence of the first user request becomes the title of the session's provisional item: markup, paths, URLs, emails and secret-looking strings stripped, one line, at most 80 characters; the rest of the prompt is never stored or logged.
- [x] `item_titles_from_requests = false` in `config.toml` turns capture and use off (default on); the title falls back to the repo, branch and date title.
- [x] `work_items.title_source` is `request`, `fallback` or `anchor`; an anchor title (ticket key, branch) always wins.
- [x] `vantage titles` lists what is stored and `vantage titles clear` deletes it.
- [x] Re-ingest is idempotent; existing sessions already ingested get a title on the next pass.
- [x] Tests with synthetic prompts: secrets, markup, very long, empty, off switch, idempotence; the title appears nowhere else (status file, health, doctor).
- [x] Docs: ingestion, operations, work-item-model, README data section; new proposed decision.

## Out of Scope

Titles for anchored items; Codex sessions; using any model to write titles; sending titles anywhere.

## Summary of Changes

Core: `requestTitle` (cleaning and cap) and `firstRequestTitle`. Daemon: migration 6 (`work_items.title_source`, table `session_titles`), `titles.ts` (head read, capture once per file with a marker cursor, list and clear), ingest captures when the setting is on (also for files already ingested), the stage pass titles `session:<id>` items from stored titles and records the source, `item_titles_from_requests` read at start. CLI: `vantage titles` and `vantage titles clear`. Docs: proposed D93, ingestion, operations, work-item-model, data-schema, README data section, ROADMAP. Tests: 39 core, 18 daemon, 4 CLI.
