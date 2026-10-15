# Releasing Vantage

For the maintainer. A release is one merge you choose to make. Nothing goes live by itself: the npm packages are only **staged** by CI, and you approve each one with 2FA. Design and reasons: [CI/CD spec](docs/specs/ci.md#releasing) and D96 in [decisions](docs/DECISIONS.md).

## How a release happens

1. Work lands on `main` as Conventional Commits (`feat:`, `fix:`, `perf:`; `feat!:` or a `BREAKING CHANGE:` footer for breaking changes).
2. `release-pr` opens or updates one PR from `release/next` that changes only `package.json` (the one product version) and `CHANGELOG.md`. Before 1.0, `feat` bumps minor, `fix` and `perf` bump patch, and a breaking change bumps minor.
3. **You merge that PR.** That merge is the release decision. Commit types `docs`, `chore`, `ci`, `test`, `refactor` and `build` never cause a release.
4. `release` runs on the merge commit: checks and build, the 5 native builds, the package assembly, then the **GitHub Release** (tag `vX.Y.Z`, notes from `CHANGELOG.md`, the native binaries, the npm tarballs and `SHA256SUMS`, with a build provenance attestation).
5. `publish-npm` is **gated**. It is skipped until you set `NPM_PUBLISH_ENABLED`. Once enabled, it waits for your approval in the `npm-publish` environment, runs a dry run, then **stages** the native packages and last the main package with `npm stage publish`. It uses npm trusted publishing (OIDC): there is no npm token anywhere.
6. **You approve the staged packages** on npmjs.com (Staged Packages tab) or with `npm stage list` and `npm stage approve <stage-id>`. npm asks for 2FA. Only then are they live, with provenance generated automatically.

Pull requests that touch the release files, and manual dispatches, run the same build as a rehearsal: no Release, no publish, no secrets.

Install after the first release: `npx @ymatrix1/vantage --version`, or `npm install -g @ymatrix1/vantage` for the `vantage` command.

## What you approve

| When | Where | What to check |
|---|---|---|
| Merging the release PR | The PR | The notes describe what you want to ship; `code` and `docs` are green |
| Starting the npm stage | The `release` run, `publish-npm` job, "Review deployments" | The version; the GitHub Release already exists and its `SHA256SUMS` look right |
| Making packages live | npmjs.com Staged Packages, or `npm stage approve` | The staged tarball is the one in the GitHub Release (`npm stage download <stage-id>` and compare the hash), then 2FA |

## One-time setup (owner checklist)

None of this is done. The workflows do not create any of it, and they do not work around it. Names live in one place, `tools/package-names.mjs`; change the scope there if you pick another.

- [ ] **Package names.** The product is `@ymatrix1/vantage` (the unscoped `vantage` is taken on npm) and the native hooks are `@ymatrix1/vantage-hook-<os>-<cpu>` (5 packages). Check they are free: `npm view @ymatrix1/vantage` should answer E404. The scope is your npm username, or create an npm organisation with that name.
- [ ] **Licence.** The packages say `UNLICENSED` because the repo has no licence file. Choose one before the first publish: it is part of the tarball.
- [ ] **Enable 2FA** on your npm account (staged publishing and approval need it).
- [ ] **Create each package once, by hand.** A trusted publisher can only be added to a package that exists. From a built tarball of the first release, log in on your own terminal (`npm login`) and run `npm publish ./<tarball> --access public` for each of the 6 packages. Do not use a token file, and do not do this from CI. (npm also documents that staging a package that does not exist yet publishes a placeholder version `0.0.0-stage`; if you prefer that route, follow the docs at https://docs.npmjs.com/staged-publishing.)
- [ ] **Add the trusted publisher** to each of the 6 packages: npmjs.com → the package → Settings → Trusted publishing → GitHub Actions. Organization or user `ymatrix1`, repository `vantage`, workflow filename exactly `release.yml` (with the extension, case-sensitive), environment `npm-publish`. Leave "Allowed actions" on staging only (`npm stage publish`). npm does not validate these on save, so a typo shows only at publish time, and a new configuration must complete its first publish within 2 days.
- [ ] **Create the environment.** Repository Settings → Environments → New environment, named exactly `npm-publish`. Add yourself under Required reviewers. Under Deployment branches choose "Selected branches" and allow only `main`. Do not tick "Prevent self-review" while you are the only maintainer: it would block every release.
- [ ] **Turn the publish on.** Settings → Secrets and variables → Actions → Variables → New repository variable `NPM_PUBLISH_ENABLED` = `true`. Do this after the steps above. Without it `publish-npm` is skipped.
- [ ] **Let the workflow open the PR.** Settings → Actions → General → Workflow permissions → tick "Allow GitHub Actions to create and approve pull requests". Leave the default token permission on "Read repository contents".
- [ ] **Branch protection for the release PR.** A PR opened with `GITHUB_TOKEN` does not start the `code` and `docs` checks. Either close and reopen the PR yourself (the reopen starts them), or give `release-pr` a fine-grained token or GitHub App instead. Keep `main` protected so the release PR still needs those checks.
- [ ] **Protect release tags (optional).** Settings → Rules → New tag ruleset for `v*`, restricting who can create or delete them.
- [ ] **Rehearse.** Run the `release` workflow by hand (Actions → release → Run workflow) on `main`. It must end green with no Release and no publish.
- [ ] **Last, lock tokens out.** For each of the 6 packages: Settings → Publishing access → "Require two-factor authentication and disallow tokens". Trusted publishing keeps working.

## Rolling back

| Problem | Do this |
|---|---|
| Release PR looks wrong | Close it. The next push to `main` opens a fresh one. Nothing was released. |
| Bad GitHub Release, nothing staged | Delete the Release and the tag (`gh release delete vX.Y.Z --cleanup-tag`), revert the release PR, merge a fix. The next release PR starts from the previous tag. |
| Staged package looks wrong | Do not approve it: reject it (`npm stage reject <stage-id>`, or on npmjs.com). Nothing went live. |
| Bad version already live on npm | Do not republish the same number. Run `npm deprecate @ymatrix1/vantage@X.Y.Z "do not use: <reason>"` (and the same for each `@ymatrix1/vantage-hook-*`), then ship a patch. `npm unpublish` works only within 72 hours and breaks anyone who locked that version, so use it only for a leaked secret or a harmful file. |
| Publish stopped halfway (native packages out, main package not) | Re-run the failed `publish-npm` job. It skips versions that are already live. |
| A secret was published | Revoke it at its provider first, then deprecate or unpublish, then ship a patch. |

## What the automation never does

It never pushes to `main`, never makes a package live without your 2FA approval, holds no npm token, and never runs the publish for pull requests, forks or manual dispatches. Actions are pinned by commit SHA; update them in their own PR.

## Appendix: optional token fallback

Not used and not configured. Only if trusted publishing cannot be used: create an npm granular access token limited to these 6 packages, store it as an environment secret of `npm-publish`, and change the publish step of `release.yml` to read it. That is a security regression (a long-lived secret) and a workflow change that needs its own PR and decision; the `release-workflow` test fails while the workflow mentions a token, so change that test on purpose.
