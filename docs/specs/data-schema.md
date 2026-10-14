# Spec: data schema (draft)

SQLite, WAL mode, in `~/.vantage/vantage.db`. Field lists come from the [work item model](work-item-model.md) and [proof spec](proof.md).

## Tables

| Table | Key columns | Notes |
|---|---|---|
| `schema_meta` | version | Latest applied migration number. A mirror kept for databases and tools that read it; the record of truth is `schema_migrations`. |
| `schema_migrations` | number, name, sha256, applied_at | One row per applied migration (migration 6, D91). `sha256` is of the file text with line endings normalised. Rows backfilled at the upgrade carry the checksum of the file as shipped then, and the upgrade time. |
| `events` | id, source, source_id (unique per source), kind, occurred_at, ingested_at, session_id, repo, payload_json, payload_version | Append-only. Dedupe on (source, source_id). |
| `cursors` | source, cursor, updated_at | One row per adapter |
| `sessions` | id, agent, cwd, repo, branch, started_at, last_activity | |
| `contexts` | id, name, rules_json | |
| `projects` | id, context_id, name, kind, external_id, repos_json | |
| `work_items` | id, item_key (unique), kind, title, project_id, repo, stage, sub_state, proof_status, proof_level, docs_only, branch, has_edits, priority, difficulty_estimate, parked, parent_id, first_activity, last_activity, created_at, updated_at | Derived by the stage pass (D71). `item_key` is the linker's key, e.g. `issue:FTK-1`. |
| `anchors` | id, work_item_id, kind, value | Unique on (kind, value) |
| `links` | event_id, item_key, method, anchor_kind, anchor_value, rule, confidence, created_at, undone_at | Keyed by `item_key`, not `work_items.id`, so the linker runs before items exist. Undo sets `undone_at`; the row stays as a tombstone. |
| `item_sessions` (view) | item_key, session_count, derived_count, subagent_count | Per item, from live links and events (migration 4, D86): sessions with a live link, those that derive from another session (`session.derived`), and distinct sub-agent runs (`agentId`). Undone links don't count. Read it with `itemSessionCounts` in the daemon. |
| `behaviors` | id, work_item_id, text, origin, approved, created_at | |
| `proofs` | id, work_item_id, behavior_id, event_id, type, level, source, command, cwd, exit_code, started_at, finished_at, state (`fresh`, `expired`, `failed`, `weak`), weak_reason, expired_by_event_id, result_json, excerpt, artifacts_json, fingerprint | Phase 1 fills event_id, type, level, source, command, cwd, started_at, state, weak_reason, expired_by_event_id and fingerprint. Expired and failed rows stay. |
| `flags` | id, work_item_id, kind, severity, raised_at, cleared_at, dismissed, reason | Dismissals feed flag precision |
| `stage_changes` | id, work_item_id, from_stage, to_stage, at, event_id, reason | Why a card moved, with the causing event (D45). Rebuilt each pass. |
| `people` | id, display_name, ids_json | |
| `explanations` | id, target_kind, target_id, kind (`brief`, `why_tree`, `status_tree`), audience, depth, blocks_json, evidence_ids_json, frozen, created_at, stale | Explain cache; `why_tree` rows are frozen once confirmed |
| `pings` | id, work_item_id, kind (`owe_reply`, `follow_up_due`, `close_the_loop`), person_id, source_ref, due_at, state (`open`, `drafted`, `done`, `snoozed`), draft_text, cleared_by_event_id | Drafts stay local until the user sends them |
| `rewards` | id, kind (`streak`, `badge`), key, value_json, updated_at | Streaks pause, never reset |
| `mood_checks` | id, day, score (1–5), note | One per evening landing; local only |
| `settings` | key, value_json | Theme, working hours, digest times, thresholds, quiet mode |
| `decisions` | id, work_item_id, project_id, who_kind (`ai`, `person`), who_ref, context, decision, why, alternatives, impact, status (`proposed`, `approved`, `changed`, `reverted`, `superseded`), replaces_id, evidence_ids_json, created_at, status_at | Append-only readable log; unstated fields stay null |
| `user_actions` | id, kind, target, payload_json, at | Pins, demotes, splits, merges, unlinks; replayable |

## Rules

- **Events are immutable.** Everything else can be rebuilt by replaying events plus `user_actions`. This is also the recovery path after a bug.
- **Event payloads are versioned** (`payload_version`) so old events stay readable after a source format change.
- **Migrations** are numbered SQL files applied at daemon start, one transaction each. See [Migrations](#migrations). The automatic backup before applying one is specified in [operations](operations.md) and is not built yet.
- **Linking to merges uses PR numbers and branches, not commit ids.** Squash merges and rebases create new commit ids, so a merged PR is matched by its number and head branch.

## Migrations

The store is installed on a real machine and its events are the source of truth (D33), so the migration runner (`packages/daemon/src/migrations.ts`, D91) is strict.

**Files.** One file per migration in `packages/daemon/migrations/`, named `NNNN-slug.sql`: four digits, then lowercase words joined by dashes. Numbers start at `0001`, with no gaps and no duplicates. The runner loads every file at start, in numeric order, and applies the pending ones, each in its own transaction. Plain SQL only; the runner needs no other format.

**Record.** `schema_migrations` holds the number, name, sha256 and `applied_at` of every applied migration. Before applying anything, the runner compares the table with the files and stops with a `MigrationError` (the daemon and `vantage start` print it and exit 1; nothing is applied) when:

| Situation | Code | What to do |
|---|---|---|
| An applied file's text changed | `checksum-mismatch` | Restore the file from git; put the change in a new migration |
| An applied migration was renamed | `name-mismatch` | Restore the name |
| The database is newer than the code | `database-newer` | Update Vantage, or restore an older backup |
| Numbers have a gap or a duplicate, a file name is wrong, or the folder is empty | `gap`, `duplicate`, `bad-name`, `empty` | Fix the files |

A database created before migration 6 has only `schema_meta`. Migration 6 creates `schema_migrations`, and the runner backfills the earlier migrations with the checksums of the files as shipped. From then on the checksums protect them. The backfill cannot prove those files match what an old release ran, so they stay frozen on the same promise as the rest.

**How to add a migration.**

1. Take the next number: `ls packages/daemon/migrations`, add one. Name it for what it does: `0007-work-item-owner.sql`.
2. Write forward-only SQL that works on a database holding real data: `ALTER TABLE ... ADD COLUMN` with a default, `CREATE TABLE`, `CREATE INDEX`. A rebuild of a derived table is fine because events can replay it; never rewrite or delete `events`.
3. Add a test that builds a database at the previous version (execute the files up to it, as `migrations.test.ts` does), migrates, and checks the old rows survived.
4. Update the tables above in this spec in the same PR.
5. Two PRs that pick the same number conflict on the file name. The one that merges second renumbers, and CI rejects a duplicate.

**Rules.**

- **Never edit, rename or delete a migration that is on `main`.** A mistake is fixed by a new migration. `tools/check_docs.py` fails CI when a migration present on the base branch changes, the same freeze as accepted decisions (D69). Line endings are not a change.
- No down migrations. Recovery is a backup, or dropping a derived table and replaying events.
- A migration may use anything an earlier one made, never anything a later one makes.
- Files are read from the package at start, not embedded in the code (D91). The daemon package lists `migrations` in `files`, so the npm package ships them.
