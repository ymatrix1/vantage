# Releasing Vantage

For the maintainer. A release is one merge you choose to make. Nothing publishes by itself: the npm publish waits for your approval and for configuration only you can do. Design and reasons: [CI/CD spec](docs/specs/ci.md#releasing) and D93 in [decisions](docs/DECISIONS.md).

## How a release happens

1. Work lands on `main` as Conventional Commits (`feat:`, `fix:`, `perf:`; `feat!:` or a `BREAKING CHANGE:` footer for breaking changes).
2. `release-pr` opens or updates one PR from `release/next` that changes only `package.json` (the one product version) and `CHANGELOG.md`. Before 1.0, `feat` bumps minor, `fix` and `perf` bump patch, and a breaking change bumps minor.
3. **You merge that PR.** That merge is the release decision. Commit types `docs`, `chore`, `ci`, `test`, `refactor` and `build` never cause a release.
4. `release` runs on the merge commit: checks and build, the 5 native builds, the package assembly, then the **GitHub Release** (tag `vX.Y.Z`, notes from `CHANGELOG.md`, the native binaries, the npm tarballs and `SHA256SUMS`, with a build provenance attestation).
5. `publish-npm` is **gated**. It is skipped until you set `NPM_PUBLISH_ENABLED`. Once enabled, it waits for your approval in the `npm-publish` environment, runs a dry run, then publishes the native packages and last the `vantage-a2v` package with `--provenance`.

Pull requests that touch the release files, and manual dispatches, run the same build as a rehearsal: no Release, no publish, no secrets.

## What you approve

| When | Where | What to check |
|---|---|---|
| Merging the release PR | The PR | The notes describe what you want to ship; `code` and `docs` are green |
| Publishing to npm | The `release` run, `publish-npm` job, "Review deployments" | The version, the GitHub Release already exists and its `SHA256SUMS` look right |

## One-time setup (owner checklist)

None of this is done. The workflows do not create any of it, and they do not work around it.

- [ ] **Package names.** `vantage` is taken on npm (an unrelated project), so the product package is `vantage-a2v` (D93, change `PACKAGE_NAME` in `tools/assemble-main-package.mjs` if you prefer another name). The native packages use the `@vantage` scope (D72): create the npm organisation `vantage`, or pick a scope you own and change `SCOPE` in `tools/assemble-native-packages.mjs` and the lookup in `packages/cli/src/install.ts`. Check with `npm view vantage-a2v` and `npm access list packages @vantage`.
- [ ] **Licence.** The packages say `UNLICENSED` because the repo has no licence file. Choose one before the first publish: it is part of the tarball.
- [ ] **Create the environment.** Repository Settings → Environments → New environment, named exactly `npm-publish`. Add yourself under Required reviewers. Under Deployment branches choose "Selected branches" and allow only `main`. Do not tick "Prevent self-review" while you are the only maintainer: it would block every release.
- [ ] **Add the token.** In that environment, Environment secrets → `NPM_TOKEN`: an npm granular access token with read and write access to the packages above (a classic Automation token also works). Set it as an environment secret, never a repository secret, and never paste it into a file, issue or chat.
- [ ] **Turn the publish on.** Settings → Secrets and variables → Actions → Variables → New repository variable `NPM_PUBLISH_ENABLED` = `true`. Do this last. Without it `publish-npm` is skipped.
- [ ] **Let the workflow open the PR.** Settings → Actions → General → Workflow permissions → tick "Allow GitHub Actions to create and approve pull requests". Leave the default token permission on "Read repository contents".
- [ ] **Branch protection for the release PR.** A PR opened with `GITHUB_TOKEN` does not start the `code` and `docs` checks. Either close and reopen the PR yourself (the reopen starts them), or give `release-pr` a fine-grained token or GitHub App instead. Keep `main` protected so the release PR still needs those checks.
- [ ] **Protect release tags (optional).** Settings → Rules → New tag ruleset for `v*`, restricting who can create or delete them.
- [ ] **Rehearse.** Run the `release` workflow by hand (Actions → release → Run workflow) on `main`. It must end green with no Release and no publish.

## Rolling back

| Problem | Do this |
|---|---|
| Release PR looks wrong | Close it. The next push to `main` opens a fresh one. Nothing was released. |
| Bad GitHub Release, npm not published | Delete the Release and the tag (`gh release delete vX.Y.Z --cleanup-tag`), revert the release PR, merge a fix. The next release PR starts from the previous tag. |
| Bad version on npm | Do not republish the same number. Run `npm deprecate vantage-a2v@X.Y.Z "do not use: <reason>"` (and the same for each `@vantage/hook-*`), then ship a patch. `npm unpublish` works only within 72 hours and breaks anyone who locked that version, so use it only for a leaked secret or a harmful file. |
| Publish stopped halfway (native packages out, main package not) | Re-run the failed `publish-npm` job. It skips versions that are already on npm. |
| A secret was published | Revoke it at its provider first, then deprecate or unpublish, then ship a patch. |

## What the automation never does

It never pushes to `main`, never publishes without your approval, never prints the token, and never runs the publish for pull requests, forks or manual dispatches. Actions are pinned by commit SHA; update them in their own PR.
