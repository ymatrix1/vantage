# Spec: work item model

> **Status:** draft. Boundary rules accepted (D25); validate them against Phase 0 data.

## Item kinds

Not everything that needs attention is the user's own code.

| Kind | What it is | Track |
|---|---|---|
| `own_work` | Something the user is building | Full: Asked → Built → Proven → Reviewed → Shipped → Verified |
| `review_request` | Someone else's PR waiting on the user's review | Short: Asked → Reviewed (done when the review is submitted; re-review requests reopen it) |
| `commitment` | Something the user promised in Slack, Jira, Linear or a PR ("I'll check", "will fix") | Asked → done when linked to an `own_work` item or marked done |
| `follow_up` | Created by a regression after ship | Full track, `parent_id` set |

## Boundary rules

Where one work item ends and another begins:

1. **Issue key wins.** One item per Jira or Linear key. A key that spans several branches or PRs is still one item with several anchors.
2. **No key: one item per non-default branch or worktree.**
3. **Several keys on one branch:** one item per key. Each event goes to the key named nearest to it (commit message, PR title, prompt); otherwise to the branch's first key.
4. **Work on the default branch with no key:** each session with edits becomes a provisional item. Vantage suggests merging provisional items that share files within the same day.
5. **Users can Split and Merge items.** These actions are recorded and always win over the rules.
6. **Renames:** a branch rename or a key added later re-anchors the item instead of creating a new one.

## Entities

| Entity | Meaning | Key fields |
|---|---|---|
| `context` | Top-level switch such as Work or Personal | id, name, rules (repo paths, GitHub orgs) |
| `project` | Jira epic, Linear project, or a user-defined group of repos | id, context_id, name, source (`jira_epic`, `linear_project`, `repo_group`), repos |
| `work_item` | One goal the user cares about. One card. | id, title (≤ 6 words), project_id, repo, stage, sub_state, flags, priority, difficulty_estimate, parked, parent_id (for follow-ups), created_at |
| `anchor` | A deterministic identifier that ties evidence to an item | kind (`branch`, `worktree`, `issue_key`, `pr`, `slack_thread`, `todo`, `file_set`), value |
| `event` | An immutable fact from a source | source, kind, timestamp, payload, session_id? |
| `link` | Attaches an event or anchor to a work item | work_item_id, target, method (`anchor`, `inferred`, `user`), confidence, confirmed |
| `session` | One agent conversation | agent (`claude_code`, `codex`), session_id, cwd, branch, started_at, last_activity |
| `behavior` | Short Given/When/Then statement on an item | text, origin (`user`, `ticket`, `ai_decided`), approved, proof_status, proof_event_id |
| `proof` | A qualifying test or data check | command, exit_code, output_excerpt, ran_at, files_touched_before |

## Anchors, in order of trust

1. **Issue key** from Jira or Linear, in branch name, commit message, PR title or chat (Jira `FTK-1234`, Linear `ENG-123`). Linear's suggested branch names (`user/eng-123-title`) and PR links are matched too.
2. **PR number** and its head branch.
3. **Branch or worktree.** Most agent work runs in a dedicated worktree, so this maps 1:1 for most items.
4. **TodoWrite items** inside a session.
5. **Slack thread permalink** for commitments and mentions.
6. **File set overlap**: weakest, used only to propose links.

## Linking rules

- **Deterministic first.** If an event carries a trusted anchor, link it with `method = anchor`.
- **Inferred links** (`method = inferred`) come from an LLM or a judgment model and are shown as "suggested" until confirmed, or until enough deterministic evidence agrees.
- **Every link is visible and undoable** from the item view.
- **A session can feed several items** (one chat touching two tickets). Events are linked individually, not whole sessions.
- **Ghosts:** a session with user requests, no edits and no anchor yields a *proposed* Asked item that the user confirms or dismisses.

## Project assignment

1. The item's Jira epic or Linear project, if its issue has one.
2. Otherwise the user-defined repo group that contains its repo.
3. Otherwise the default project for its repo.

The user can move an item to another project; that choice wins.

## Follow-ups

A regression creates a new `work_item` with `parent_id` set to the original. The original stays Shipped or Verified with a `regression` flag.
