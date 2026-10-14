# Spec: data schema (draft)

SQLite, WAL mode, in `~/.vantage/vantage.db`. Field lists come from the [work item model](work-item-model.md) and [proof spec](proof.md).

## Tables

| Table | Key columns | Notes |
|---|---|---|
| `schema_meta` | version | Current schema version |
| `events` | id, source, source_id (unique per source), kind, occurred_at, ingested_at, session_id, repo, payload_json, payload_version | Append-only. Dedupe on (source, source_id). |
| `cursors` | source, cursor, updated_at | One row per adapter |
| `sessions` | id, agent, cwd, repo, branch, started_at, last_activity | |
| `contexts` | id, name, rules_json | |
| `projects` | id, context_id, name, kind, external_id, repos_json | |
| `work_items` | id, kind, title, project_id, repo, stage, sub_state, priority, difficulty_estimate, parked, parent_id, created_at, updated_at | |
| `anchors` | id, work_item_id, kind, value | Unique on (kind, value) |
| `links` | id, work_item_id, event_id, method, confidence, confirmed, created_at | Undo = delete row, keep an audit event |
| `behaviors` | id, work_item_id, text, origin, approved, created_at | |
| `proofs` | id, work_item_id, behavior_id, type, level, source, command, cwd, exit_code, started_at, finished_at, result_json, excerpt, artifacts_json, fingerprint | |
| `flags` | id, work_item_id, kind, severity, raised_at, cleared_at, dismissed, reason | Dismissals feed flag precision |
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
- **Migrations** are numbered SQL files applied at daemon start, in a transaction, after an automatic backup.
- **Linking to merges uses PR numbers and branches, not commit ids.** Squash merges and rebases create new commit ids, so a merged PR is matched by its number and head branch.
