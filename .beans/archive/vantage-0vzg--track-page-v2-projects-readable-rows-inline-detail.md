---
# vantage-0vzg
title: 'Track page v2: projects, readable rows, inline detail, links'
status: completed
type: feature
priority: normal
created_at: 2026-10-14T23:58:43Z
updated_at: 2026-10-15T00:13:40Z
parent: vantage-fmfh
---


## Context

The user ran the real page: names are hard to read (a row titled with the branch and a worktree folder as subtitle), there are no links, rows cannot expand, and the page is not organised top-down. Blocked by: none (PR #50 merged). PRs #56 and #59 also touch `api.ts` and `track.ts`; this bean keeps its API changes in new files plus one route.

## Higher Goal

Read the Track page top-down in seconds: how is today, which project, which item, why, then the evidence.

## Acceptance Criteria

- [x] L0 header line with counts that filter when clicked, date range and stale badge
- [x] L1 projects: grouped by repo from the git remote (never the worktree folder), collapsible, with counts, last activity and repo link
- [x] L2 rows: human title, subtitle branch plus time (never the worktree folder), dots with stage label, flag reason in words, session chip, link icons
- [x] L3 inline expand (click, Enter, Esc, `e`): sessions, files (base names), proofs, timeline, why flagged, actions (branch link, copy branch, copy cd path)
- [x] Links built only from remote, branch and sha, escaped, `rel="noopener noreferrer"`, target blank; no PR link invented
- [x] API: project repo from the remote, `GET /api/items/:id` detail (sessions, files, worktree path, last commit)
- [x] Pager at top and bottom, page size, sticky toolbar, `[` `]` verified on the real build
- [x] Component and unit tests; real daemon check in the browser pane; docs updated

## Out of Scope

PR links and ticket links (GitHub and tracker sources, later phases). Classifying scratch files as edits (API session). `stage.ts`.

## Summary of Changes

- Daemon: `projects.ts` stores an item's repo as the git remote path (via the worktree the scanner saw); `item-detail.ts` and `GET /api/items/:id` (sessions with parent, files by base name, worktree, last commit). Core: `repoUrlOf`, `projectNameOf`, `ItemDetailView`.
- UI: `Header` (L0), project sections (L1), `Row` (L2), `Detail` (L3), `title.ts`, `links.ts`, `summary.ts`, `projects.ts`, `sessions.ts`; default group is project; sticky summary and toolbar; pager above and below; key `e`.
- Specs: web-ui (Track layout, API, keys), UX (Track), ROADMAP; D100 proposed.
- Tests: 636 repo-wide (new: names-links, track-v2, project-detail, repo-url). Real daemon with synthetic events in the browser pane.
- Limits: projects are ordered by the rows on the page; group totals include folded rows; no PR or ticket links yet.
