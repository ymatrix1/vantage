# Spec: CI/CD

CI for the Vantage repo itself. Hosted CI never sees real data: fixtures only (see the [privacy boundary](../../.agents/rules/privacy-boundary.md)).

## Now: docs (workflow `.github/workflows/docs.yml`)

Runs on every push to `main` and every PR.

| Check | Tool | Fails when |
|---|---|---|
| Broken relative links | `tools/check_docs.py` | A Markdown link points to a missing file or a missing `#section` |
| Broken tables | `tools/check_docs.py` | A blank line splits a table, so rows render as text |
| Decision format (D30) | `tools/check_docs.py` | A decision or proposal lacks Context, Decision, Why, Alternatives or Impact |
| Privacy scan | `tools/check_docs.py` | Tokens, API keys or email addresses appear in tracked files |
| Secret scan | gitleaks | Secrets anywhere in history |

Run locally before pushing: `python tools/check_docs.py`.

## Phase 1: code (workflow `.github/workflows/code.yml`)

Runs on every push to `main` and every PR. Run locally with `pnpm check`.

- [x] Type check, lint (Oxlint), format (Oxfmt), Vitest, fixture scrub check, UI build; Windows and Linux
- [ ] Hook budget test (with the hooks bean)
- [ ] Security tests (with the daemon API bean)

| Check | Notes |
|---|---|
| Type check and lint | TypeScript strict mode |
| Unit and replay tests | Vitest; event fixtures replayed through linker, stage machine and scorers |
| OS matrix | Windows and Linux |
| Hook budget | Hooks finish in under 100 ms and exit 0 with the daemon down |
| Native hook parity | `packages/hooks-native/test/parity.test.ts` runs the Rust and Node hooks side by side (same line, exit 0 with the daemon down and with an unwritable spool, `Stop` handoff). It skips with a warning when `cargo` is missing; CI sets `VANTAGE_REQUIRE_NATIVE=1`, so there a missing toolchain fails |
| Fixture scrub check | Fails on anything in fixtures that looks unscrubbed (ids, emails, URLs, tokens) |
| Security tests | Server rejects wrong Origin or Host, missing token, state change on GET (D32) |

## Releasing

Proposed in D93 (not accepted yet). The maintainer's checklist is in [RELEASING.md](../../RELEASING.md).

```text
feat/fix commits on main
        -> release-pr   opens or updates PR release/next (package.json version + CHANGELOG.md)
        -> you merge it           <- the release decision
        -> release      build, test, 5 native targets, assemble
        -> GitHub Release   tag, notes, binaries, tarballs, SHA256SUMS, attestation
        -> publish-npm  GATED: variable + approval, dry run, npm stage publish (OIDC, owner approves with 2FA)
```

| Piece | What it does |
|---|---|
| `tools/release.mjs` | Reads Conventional Commits since the last `vX.Y.Z` tag. `feat` bumps minor, `fix` and `perf` patch, a breaking change minor until 1.0 (major after). Writes `CHANGELOG.md` and the root `package.json` version. `status`, `plan [--write]`, `notes <version>`, `pr-body <version>` |
| `.github/workflows/release-pr.yml` | On every push to `main`: opens or updates the release PR. Never tags or publishes. Needs "Allow GitHub Actions to create and approve pull requests" |
| `.github/workflows/release.yml` | Release on the merge of the release PR (a `package.json` version with no tag). Pull requests that touch the release files and manual dispatches run the same build as a rehearsal: no Release, no publish, no secrets |
| `.github/workflows/release-native.yml` | Builds `packages/hooks-native` for the 5 D72 targets and assembles one npm package per target. Called by `release.yml`; dry run only |
| `tools/assemble-main-package.mjs` | Stages the one npm package `@ymatrix1/vantage` (bin `vantage`): the built `cli`, `core`, `daemon`, `hooks` and `ui` as `bundledDependencies`, native packages as `optionalDependencies`, and `build-info.json` for `vantage --version` |
| `tools/smoke-install.mjs` | Installs the packed tarball into a temp directory and runs `vantage --version`, `vantage doctor` (against a temp `VANTAGE_HOME`) and `vantage start` |

### Gates and permissions

- **GitHub Release:** created by the `release` workflow from the exact merge commit. The merge of the release PR is the approval.
- **npm publish (`publish-npm`):** skipped until the repository variable `NPM_PUBLISH_ENABLED` is `true`. Then it waits for approval in the `npm-publish` environment (required reviewers), dry-runs every tarball, and runs `npm stage publish --access public` (native packages first, the main package last; versions already live are skipped so a re-run is safe). It holds no token: npm trusted publishing (OIDC) authenticates the workflow file `release.yml`, so that file name must not change without updating the trusted publisher on npmjs.com. Each staged package goes live only when the owner approves it with 2FA (`npm stage approve` or npmjs.com). `NPM_PUBLISH_MODE=publish` (a repository variable) switches to a direct `npm publish`, which the trusted publisher must then also allow; the default is staging. Needs npm 11.15.0 or newer, which the job installs by exact version.
- **Permissions:** top level `contents: read`. `contents: write` only for `release-pr` (opens the PR) and `github-release`; `id-token: write` and `attestations: write` only for `github-release`; `id-token: write` for `publish-npm` (OIDC, no secret).
- **Supply chain:** release workflows pin every action by commit SHA with the version in a comment, use no `pull_request_target`, and treat commit subjects as data (they go through files, never into a shell line). Forks never release: the release job requires `github.event.repository.fork == false`.
- **Owner configuration:** the npm names, the 6 first manual publishes, the trusted publishers, the `npm-publish` environment, `NPM_PUBLISH_ENABLED`, the pull request setting and the licence are not configured (`RELEASING.md`, `vantage-d28s`). Until they are, the workflows build and release to GitHub but cannot publish.

Upgrades back up the database first (see [operations](operations.md#upgrades-backup-and-uninstall)). Schema migrations ship inside the package.

### Native hook release (D72)

`release-native.yml` builds `packages/hooks-native` for `win32-x64`, `darwin-arm64`, `darwin-x64`, `linux-x64` and `linux-arm64`, then `tools/assemble-native-packages.mjs` writes one npm package per target (`@ymatrix1/vantage-hook-<target>`, with `os`, `cpu` and `repository`) plus the `optionalDependencies` map the main package adds. It runs on pull requests that touch the crate, on manual dispatch and as part of `release.yml`, and always ends in `npm publish --dry-run`. The one real publish is `publish-npm` above.

## Rules

- Never weaken a check to make CI pass without saying why in the PR.
- Actions in `code.yml` and `docs.yml` are pinned to major versions; the release workflows pin by commit SHA. A dependency update is its own PR.
