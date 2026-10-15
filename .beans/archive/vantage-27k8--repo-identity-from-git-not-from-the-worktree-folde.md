---
# vantage-27k8
title: Repo identity from git, not from the worktree folder
status: completed
type: bug
priority: normal
created_at: 2026-10-15T00:16:21Z
updated_at: 2026-10-15T00:25:41Z
parent: vantage-fmfh
---


## Context

On the real page the Repo filter and `group=repo` list worktree folders (`brave-joliot-995ebc`, `dev`) next to real repos, so counts per repo are wrong. An item's `repo` came from the last folder of the session's `cwd`, not from git identity. Blocked by: none. PR #63 (Track v2) has an early version of this in `projects.ts`; this bean replaces it and ships first.

## Higher Goal

One entry per real repo in every repo filter, group and chip, so "which project is this?" has one honest answer.

## Acceptance Criteria

- [x] `worktree.scanned` events carry `repo {key, name, remoteUrl}`
- [x] Each item's cwd or worktree maps to its repo by the longest scanned worktree root (read time; no migration); unmatched paths give `repo: null`
- [x] `repo` on the Track item is the remote path (or the main worktree folder for a repo with no remote); `repoUrl` is added
- [x] Repo facet and `group=repo` use it; a final "No repo" group holds the null ones
- [x] A detached `HEAD` item is titled "detached HEAD in <repo>"
- [x] Tests: two repos, a non-repo folder, ssh and https remotes of one repo, a repo with no remote, a removed worktree
- [x] Real data: count of distinct repos reported

## Out of Scope

UI changes. Item detail endpoint. Projects config.

## Summary of Changes

- Core: `RepoInfo`, `repoInfoOf`, `repoUrlOf`, `projectNameOf`; `worktree.scanned` carries `repo`. Daemon: `projects.ts` maps an item's folder to its repo (scanned worktree roots, then git, once per folder, 12 per pass); the stage pass stores it; titles never use a folder name; detached HEAD titled by repo; `repoUrl` on Track items; `group=repo` labels and a "No repo" group.
- Real store copy (counts only): distinct repos 148 → 8; 189 of 463 items have no repo (folders gone or not repos); 1 detached-HEAD title.
- D99 proposed; ingestion and web-ui specs updated.
