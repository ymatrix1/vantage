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

## Phase 1: code

Added when code exists.

| Check | Notes |
|---|---|
| Type check and lint | TypeScript strict mode |
| Unit and replay tests | Vitest; event fixtures replayed through linker, stage machine and scorers |
| OS matrix | Windows and Linux |
| Hook budget | Hooks finish in under 100 ms and exit 0 with the daemon down |
| Fixture scrub check | Fails on anything in fixtures that looks unscrubbed (ids, emails, URLs, tokens) |
| Security tests | Server rejects wrong Origin or Host, missing token, state change on GET (D32) |

## Later: releases

- "Deploy" for a personal tool means a release that installs locally (npm package or binary, open question Q18).
- Tagged releases build artifacts, attach a changelog, and include schema migrations.
- Upgrades back up the database first (see [operations](operations.md#upgrades-backup-and-uninstall)).

## Rules

- Never weaken a check to make CI pass without saying why in the PR.
- Actions are pinned to major versions; a dependency update is its own PR.
