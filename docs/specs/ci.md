# Spec: CI/CD

> **Terms:** [daemon](../GLOSSARY.md#daemon), [hook](../GLOSSARY.md#hook), [linker](../GLOSSARY.md#linker), [spool](../GLOSSARY.md#spool). Plain-language definitions are in the [glossary](../GLOSSARY.md).

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

## Later: releases

- "Deploy" for a personal tool means a release that installs locally (npm package or binary, open question Q18).
- Tagged releases build artifacts, attach a changelog, and include schema migrations.
- Upgrades back up the database first (see [operations](operations.md#upgrades-backup-and-uninstall)).

### Native hook release (D72)

`.github/workflows/release-native.yml` builds `packages/hooks-native` for `win32-x64`, `darwin-arm64`, `darwin-x64`, `linux-x64` and `linux-arm64`, then `tools/assemble-native-packages.mjs` writes one npm package per target (`@vantage/hook-<target>`, with `os` and `cpu`) plus the `optionalDependencies` map the main package adds. It runs on pull requests that touch the crate and on manual dispatch, and always ends in `npm publish --dry-run`.

A real publish exists only as the `publish` job: manual dispatch, `publish=true`, `confirm=publish`, environment `npm-publish`, the npm publish credential stored as a secret in that environment. **The environment, the secret and the npm scope are not configured**; the job fails at the token check until the user sets them up (`vantage-d28s`).

## Rules

- Never weaken a check to make CI pass without saying why in the PR.
- Actions are pinned to major versions; a dependency update is its own PR.
