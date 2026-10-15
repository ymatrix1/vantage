---
# vantage-0vzg
title: 'Track page v2: projects, readable rows, inline detail, links'
status: in-progress
type: feature
created_at: 2026-10-14T23:58:43Z
updated_at: 2026-10-14T23:58:43Z
parent: vantage-fmfh
---

## Context

The user ran the real page: names are hard to read (a row titled with the branch and a worktree folder as subtitle), there are no links, rows cannot expand, and the page is not organised top-down. Blocked by: none (PR #50 merged). PRs #56 and #59 also touch `api.ts` and `track.ts`; this bean keeps its API changes in new files plus one route.

## Higher Goal

Read the Track page top-down in seconds: how is today, which project, which item, why, then the evidence.

## Acceptance Criteria

- [ ] L0 header line with counts that filter when clicked, date range and stale badge
- [ ] L1 projects: grouped by repo from the git remote (never the worktree folder), collapsible, with counts, last activity and repo link
- [ ] L2 rows: human title, subtitle branch plus time (never the worktree folder), dots with stage label, flag reason in words, session chip, link icons
- [ ] L3 inline expand (click, Enter, Esc, `e`): sessions, files (base names), proofs, timeline, why flagged, actions (branch link, copy branch, copy cd path)
- [ ] Links built only from remote, branch and sha, escaped, `rel="noopener noreferrer"`, target blank; no PR link invented
- [ ] API: project repo from the remote, `GET /api/items/:id` detail (sessions, files, worktree path, last commit)
- [ ] Pager at top and bottom, page size, sticky toolbar, `[` `]` verified on the real build
- [ ] Component and unit tests; real daemon check in the browser pane; docs updated

## Out of Scope

PR links and ticket links (GitHub and tracker sources, later phases). Classifying scratch files as edits (API session). `stage.ts`.

## Summary of Changes

(filled in at the end)
