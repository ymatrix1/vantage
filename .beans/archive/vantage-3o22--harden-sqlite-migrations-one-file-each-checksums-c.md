---
# vantage-3o22
title: 'Harden SQLite migrations: one file each, checksums, CI check'
status: completed
type: task
priority: normal
created_at: 2026-10-14T23:25:53Z
updated_at: 2026-10-14T23:35:46Z
parent: vantage-fmfh
---

## Context

The daemon migrates its SQLite store with a `MIGRATIONS` array of SQL strings in `packages/daemon/src/store.ts` (D17). The version is the array position, held in `schema_meta`. Several open sessions add migrations in parallel (stage machine, linker, derived sessions, Track API index), so the array conflicts on merge, and nothing notices if a released migration is edited afterwards. Vantage is installed on the user's machine, so real databases must migrate safely. An ORM was evaluated and rejected for now (extra native or generated dependencies against the one-command install, D63 and D66); the user approved hardening the hand-rolled runner instead. Blocked by: none. Coordination: PRs that add migrations (Track API PR #52, a lineage follow-up) merge first; this PR merges last and converts any migration added in the meantime.

## Higher Goal

Never lose or corrupt a user's evidence store on upgrade, and let parallel work add migrations without conflicts. Events are the source of truth (D33); the store must outlive every release.

## Acceptance Criteria

- [x] Each existing migration is its own file `packages/daemon/migrations/NNNN-slug.sql`, loaded in numeric order at startup; the built package ships the files
- [x] `schema_migrations` (number, name, sha256, applied_at) is created by a new migration, backfilled for existing databases; `schema_meta` keeps working
- [x] Startup fails with a clear error on a checksum mismatch, a gap, a duplicate number, a bad file name, or a database newer than the code
- [x] A repository check fails CI on a gap, a duplicate, a name not matching `NNNN-slug.sql`, or an edit or removal of a migration present on the base branch, with a unit test
- [x] Tests: database at every historical version migrates to latest with data intact; checksum mismatch; duplicate number; second run is a no-op; real daemon and CLI start on a fresh and on an old database
- [x] `docs/specs/data-schema.md` documents how to add a migration and the rules; AGENTS.md notes it; embed-versus-read decision recorded as proposed

## Out of Scope

An ORM or query builder. Automatic backup before migrating (spec says it exists, code does not; filed as its own bean). Down migrations. Changing any migration's SQL meaning.

## Summary of Changes

- Split the `MIGRATIONS` array into `packages/daemon/migrations/0001..0005-*.sql` (mechanical: the schema from the old code and from the files is identical apart from the new table; compared through `sqlite_master`). Added `0006-schema-migrations.sql`.
- New runner `packages/daemon/src/migrations.ts`: loads and validates the files, verifies the recorded state first, applies each pending migration in its own transaction, records number, name, sha256 and time, keeps `schema_meta` as a mirror, backfills the ledger for older databases. `MigrationError` codes: `bad-name`, `empty`, `duplicate`, `gap`, `checksum-mismatch`, `name-mismatch`, `database-newer`. `Store` closes the file when startup fails.
- Files are read from the package at start (D91 proposed); the daemon `files` list ships `migrations` (checked with `npm pack --dry-run`).
- `tools/migrations_check.py` runs inside `tools/check_docs.py`: names, gaps, duplicates, and the freeze against `origin/<base>`; unit tests in `tools/test_migrations_check.py`.
- Tests: `packages/daemon/test/migrations.test.ts` (every legacy version, fresh, twice, later migration, rollback, mismatch, rename, newer, closed handle), three CLI tests (fresh home, old database, edited migration), older upgrade tests now compare to the latest number.
- Docs: data-schema Migrations section, D91 proposed, AGENTS.md rule 8 and layout line, update-spec step.
- Follow-up filed: vantage-xqdw (automatic backup before migrating; the specs promise it, the code does not do it yet).
