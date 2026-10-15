---
# vantage-d28s
title: Owner setup for npm publish and the first release (names, trusted publishers, environment, variable)
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

Follow the checklist in RELEASING.md ("One-time setup"); the release workflow (vantage-a6hi, D96) is built and waits for it. No npm token is used: trusted publishing and staged approval.

- [ ] Package names confirmed free: `@ymatrix1/vantage` and `@ymatrix1/vantage-hook-<os>-<cpu>` (change `tools/package-names.mjs` if not)
- [ ] Licence chosen (the packages say `UNLICENSED`)
- [ ] 2FA on the npm account; the 6 packages created once by hand from the first release tarballs
- [ ] Trusted publisher added to each of the 6 packages (user `ymatrix1`, repository `vantage`, workflow `release.yml`, environment `npm-publish`, staging only)
- [ ] `npm-publish` environment with required reviewers, restricted to `main`
- [ ] "Allow GitHub Actions to create and approve pull requests" ticked; release PR checks plan chosen (close and reopen, or a token or app)
- [ ] `NPM_PUBLISH_ENABLED` repository variable set to `true`
- [ ] Rehearsal run of the `release` workflow by hand is green
- [ ] First release PR merged, GitHub Release exists, staged packages approved with 2FA and live on npm
- [ ] "Require two-factor authentication and disallow tokens" set on the 6 packages
- [ ] `docs/install-for-agents.md` and README tried on a fresh machine through `npm install -g @ymatrix1/vantage`

## Out of Scope

Changing the hook.
