---
# vantage-c4gz
title: Issue sync (read) for the user's tracker, and issue_policy
status: draft
type: feature
created_at: 2026-10-14T23:14:54Z
updated_at: 2026-10-14T23:14:54Z
parent: vantage-nqh6
---

## Context

D90 (accepted): issues live in the user's tracker and Vantage only syncs them; no internal issue manager. After the first real run most sessions had no issue (hundreds of untitled Session items). Needs: the first tracker to build (the user chooses: Jira, Linear or GitHub Issues), a user-scoped token stored safely (vantage-5fek, OS credential store), the read-only research in vantage-vncu (Jira mentions and Linear notifications APIs). Moving this from Phase 6 into Phase 2 changes the roadmap scope, so it needs the user's OK; this bean stays a draft until then. Blocked by: the user's choice of tracker.

## Higher Goal

Every session that changes code can be tied to a real issue with a real title and link, without Vantage becoming an issue manager.

## Acceptance Criteria

- [ ] Tracker choice recorded (which one first) and config key to select it
- [ ] Read-only adapter: given an issue key, returns title, link, status, assignee, priority; rate limits and errors handled, nothing written back
- [ ] An issue key in a branch, worktree or first request anchors the item (D25 rule 1) and the item shows the tracker's title and link
- [ ] issue_policy setting (off, suggest default, require): counts and nudges sessions with code edits and no issue; require adds a Stop gate warning (warn only, never blocking); sessions without code edits exempt (D53)
- [ ] Token never in the repo, logs, the status file or any URL; stored via the credential store

## Out of Scope

Two-way sync, creating or editing issues, Slack, mentions and pings (Phase 6), an internal issue manager.

## Summary of Changes

TBD
