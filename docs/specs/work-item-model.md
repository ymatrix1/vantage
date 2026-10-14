# Spec: work item model

> **Status:** draft. The linker design is the most important open decision. See [open questions](../OPEN-QUESTIONS.md).

## Entities

| Entity | Meaning | Key fields |
|---|---|---|
| `work_item` | One goal the user cares about. One card. | id, title (≤ 6 words), repo, stage, sub_state, flags, priority, difficulty_estimate, parked, parent_id (for follow-ups), created_at |
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

## Follow-ups

A regression creates a new `work_item` with `parent_id` set to the original. The original stays Shipped or Verified with a `regression` flag.
