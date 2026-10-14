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
| `work_items` | id, item_key (unique), kind, title, project_id, repo, stage, sub_state, proof_status, proof_level, docs_only, branch, has_edits, priority, difficulty_estimate, parked, parent_id, first_activity, last_activity, created_at, updated_at | Derived by the stage pass (D71). `item_key` is the linker's key, e.g. `issue:FTK-1`. |
| `anchors` | id, work_item_id, kind, value | Unique on (kind, value) |
| `links` | event_id, item_key, method, anchor_kind, anchor_value, rule, confidence, created_at, undone_at | Keyed by `item_key`, not `work_items.id`, so the linker runs before items exist. Undo sets `undone_at`; the row stays as a tombstone. |
| `item_sessions` (view) | item_key, session_count, derived_count, subagent_count | Per item, from live links and events (migration 4, D86): sessions with a live link, those that derive from another session (`session.derived`), and distinct sub-agent runs (`agentId`). Undone links don't count. Read it with `itemSessionCounts` in the daemon. |
| `event_branches` | source, source_id, branch | The branch a transcript line said was checked out when a tool call ran (migration 6, D92). Beside the events, which stay immutable; `loadEvents` fills `payload.branch` from it when the payload has none. First value wins. |
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
- **Migrations** are numbered SQL files applied at daemon start, in a transaction, after an automatic backup.
- **Linking to merges uses PR numbers and branches, not commit ids.** Squash merges and rebases create new commit ids, so a merged PR is matched by its number and head branch.
