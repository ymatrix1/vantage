---
# vantage-81ok
title: Search inside the text of sessions
status: draft
type: feature
created_at: 2026-10-15T13:36:22Z
updated_at: 2026-10-15T13:36:22Z
parent: vantage-nqh6
---

## Context
User request: Track search should also search inside the context text of sessions, not only title, repo and branch. Today search reads metadata only. Blocked by: none (builds on the Track search box and the session names of the session-names PR).

## Higher Goal
Find the work I did by what was said or done in it, across agent sessions.

## Acceptance Criteria
- [ ] Decide the implementation (recorded as a decision and Q33 answered), options to decide later:
  - A: local full-text index (SQLite FTS5 table in the local DB)
  - B: scan the transcript files when a query runs (no stored copy)
  - C: metadata only (status quo)
- [ ] Search matches session text and shows where it matched
- [ ] The UI says the search reads session text
- [ ] Tests with synthetic fixtures only

## Out of Scope
Embeddings and vector search (Q25). Sending text off the machine. Choosing the option now.
