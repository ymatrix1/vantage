---
# vantage-d28s
title: Owner setup for npm publish and the first release (names, environment, token, variable)
status: draft
type: task
created_at: 2026-10-14T19:26:53Z
updated_at: 2026-10-14T19:26:53Z
parent: vantage-fmfh
blocked_by:
    - vantage-bfr1
    - vantage-a6hi
---

## Context

Split from vantage-bfr1. Needs the user: the npm scope that owns the @vantage/hook-* names, an npm-publish GitHub environment with required reviewers, and an npm publish credential stored as an environment secret. Blocked by vantage-bfr1. Left unconfigured on purpose.

## Higher Goal

Never slow an agent down.

## Acceptance Criteria

Follow the checklist in RELEASING.md ("One-time setup"); the release workflow (vantage-a6hi, D91) is built and waits for it.

- [ ] npm package names and the `@vantage` scope confirmed, or renamed (`vantage` is taken on npm; the product package is `vantage-a2v`)
- [ ] Licence chosen (the packages say `UNLICENSED`)
- [ ] `npm-publish` environment with required reviewers, restricted to `main`
- [ ] `NPM_TOKEN` stored as a secret of that environment only
- [ ] "Allow GitHub Actions to create and approve pull requests" ticked; release PR checks plan chosen (close and reopen, or a token or app)
- [ ] `NPM_PUBLISH_ENABLED` repository variable set to `true`
- [ ] Rehearsal run of the `release` workflow by hand is green
- [ ] First release PR merged, GitHub Release exists, `publish-npm` approved and the packages are on npm
- [ ] `docs/install-for-agents.md` and README tried on a fresh machine through `npm install -g vantage-a2v`

## Out of Scope

Changing the hook.
