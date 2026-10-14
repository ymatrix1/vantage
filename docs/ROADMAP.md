# Roadmap

Built in layers. Local sources first, then GitHub, then CI/CD and monitoring, then Jira and Slack. Each phase must be useful on its own.

## Phase 0: measure (1–2 days)

- Mine existing Claude Code and Codex transcripts plus `gh` data to get baselines: share of sessions ending with unproven edits, thrash loops, abandoned dirty work, review rounds per PR, time to first review.
- **Exit:** a short baseline report in `docs/research/baseline.md` that ranks the pains by real numbers.

## Phase 1: event spine and proof gate

- Hook collector writing events to the local store; transcript backfill.
- `Stop` hook proof gate in warn mode.
- Status line showing edits vs. proof and sessions waiting.
- **Exit:** used daily for a week; warnings judged useful more often than noisy.

## Phase 2: work items and board

- Linker with deterministic anchors (branch or worktree, Jira key in branch, todos).
- Stage machine for Asked, Built and Proven.
- Local web UI: Board and Item detail; "since yesterday" filter.
- Ghost proposals from sessions with no edits.
- **Exit:** the morning catch-up uses the board instead of terminals.

## Phase 3: Focus, calm and alerts

- Priority, difficulty, spread, staleness.
- Focus screen, digest batching, "safe to ignore".
- Toasts for red items; `waiting_on_you` and `forgotten` flags.

## Phase 4: reviews

- GitHub PR ingestion; Reviewed stage and sub-states.
- `claimed_fixed` detector; re-review tracking.

## Phase 5: ship and verify

- GitHub deployments and Actions; Shipped and Verified stages.
- `shipped_unverified` and `regression` flags; follow-up cards.
- Monitoring adapter for the tool actually in use.

## Phase 6: Jira and Slack

- Assigned tickets as Asked items; priority and due date.
- Unseen mentions; commitment detection.

## Later

- Behaviors with proof badges and AI-decided detection.
- Codex parity for live events.
- Judgment model layer.
