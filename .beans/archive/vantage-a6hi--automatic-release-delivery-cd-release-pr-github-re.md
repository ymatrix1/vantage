---
# vantage-a6hi
title: 'Automatic release delivery (CD): release PR, GitHub Release, gated npm publish'
status: completed
type: feature
created_at: 2026-10-14T23:34:45Z
updated_at: 2026-10-14T23:34:45Z
parent: vantage-fmfh
---

## Context

Phase 1 is built but there is no release process: no tags, GitHub Releases, changelog or published package, so install needs a clone and build. Blocked by: none.

## Higher Goal

Install without a clone and build, and make every release a deliberate, reviewable, reproducible act.

## Acceptance Criteria

- [x] Release PR automation: version bump and CHANGELOG from Conventional Commits (pre-1.0 rules), one product version (`tools/release.mjs`, `release-pr.yml`; tested on a synthetic repo and run read-only against the real history: 0.0.0 to 0.1.0)
- [x] One installable npm package whose bin runs the CLI; the packed tarball installs into a temp directory and runs `--version`, `doctor` and `start` (`tools/smoke-install.mjs`)
- [x] Release workflow: build, test, 5-target native build, GitHub Release with artifacts and SHA256SUMS, provenance attestation. Rehearsal run on PR 60 is green (verify, native, assemble pass; github-release and publish-npm skipped as designed). The release and attestation steps themselves cannot run before `main` holds a bumped version, so they are unexercised
- [x] npm publish stays gated (variable, environment, token check, dry run first); least-privilege permissions; actions pinned by SHA
- [x] `vantage --version` and a doctor version row, with tests
- [x] Package content test, release-notes test, docs check for RELEASING.md
- [x] Docs: ci.md Releasing, RELEASING.md, install guide, README, ROADMAP; D98 recorded as proposed
- [x] Owner configuration split into a follow-up bean (`vantage-d28s`, now covers names, licence, environment, token, variable, rehearsal, first release)

## Out of Scope

Creating tags, releases, secrets, environments or publishing; repository settings; choosing the licence; Homebrew or other channels.

## Summary of Changes

- `tools/release.mjs`: Conventional Commit parsing, pre-1.0 bump rules, changelog and release notes, `status`, `plan`, `notes`, `pr-body`.
- `tools/assemble-main-package.mjs`: the one `vantage-a2v` package (built workspace packages bundled through `bundledDependencies`, native packages optional); `tools/smoke-install.mjs` installs and runs the tarball.
- Workflows: `release-pr.yml` (release PR), `release.yml` (build, native, assemble, GitHub Release, attestation, gated `publish-npm`); `release-native.yml` is now callable and no longer has its own manual publish. Actions pinned by SHA.
- `vantage --version` (`build-info.json` in a release, package version plus git sha in a checkout) and a doctor `version` row.
- Docs: `RELEASING.md` with the owner checklist, ci.md "Releasing", install guide and README release path, ROADMAP, D98 proposed; `tools/releasing_check.py` in `check_docs.py`.
- Found: `vantage` is taken on npm (1.7.0), so the package is `vantage-a2v`; the `@vantage` scope is unverified. Not done: any real tag, release, publish or repository setting (owner work, `vantage-d28s`).
