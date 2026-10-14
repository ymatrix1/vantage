# Roadmap

Built in layers. Local sources first, then GitHub, then CI/CD and monitoring, then the issue tracker (Jira or Linear) and Slack. Each phase must be useful on its own.

## Phase 0: measure (1–2 days)

- Use DuckDB to mine existing Claude Code and Codex transcripts (queried directly as `.jsonl`) plus `gh` data to get baselines: share of sessions ending with unproven edits, thrash loops, abandoned dirty work, review rounds per PR, time to first review.
- **Exit:** a short baseline report in `docs/research/baseline.md` that ranks the pains by real numbers.
- Epic bean: `vantage-pdgc`.

| Lane | Beans | Blocked by |
|---|---|---|
| Agent data | `vantage-mmum` (R1 baseline), `vantage-o3sq` (R2 hooks), `vantage-ab70` (R3 Codex), `vantage-r43j` (R8 reuse) | none |
| Remote sources | `vantage-ql2e` (R4 GitHub), `vantage-wok9` (R5 deploy and monitoring), `vantage-i3ku` (R6 Slack), `vantage-vncu` (R7 Jira and Linear) | none |
| Platform and look | `vantage-aveh` (R9 Windows), `vantage-i3pu` (R11 theme) | none |
| Judge | `vantage-ibuz` (R10 model comparison) | R1, data policy decision |
| Your decisions | `vantage-h8fv` (data policy), `vantage-akld` (Slack admin) | none |

## Phase 1: event spine and proof gate

- Hook collector writing events to the local store; transcript backfill.
- `Stop` hook proof gate in warn mode.
- Status line showing edits vs. proof and sessions waiting.
- **Exit:** used daily for a week; warnings judged useful more often than noisy.

## Phase 2: work items and board

- Linker with deterministic anchors (branch or worktree, issue key in branch, todos).
- Stage machine for Asked, Built and Proven.
- Local web UI: Track (attention and project grouping), Item and Journal; "since yesterday" filter.
- Ghost proposals from sessions with no edits.
- **Exit:** the morning catch-up uses the board instead of terminals.

## Phase 3: Focus, calm and alerts

- Priority, difficulty, spread, staleness.
- Focus page, Inbox page, digest batching, "safe to ignore".
- Contexts (Work, Personal) and project settings on the Sources page.
- Toasts for red items; `waiting_on_you` and `forgotten` flags.

## Phase 4: reviews

- GitHub PR ingestion; Reviewed stage and sub-states.
- `claimed_fixed` detector; re-review tracking.

## Phase 5: ship and verify

- GitHub deployments and Actions; Shipped and Verified stages.
- `shipped_unverified` and `regression` flags; follow-up cards.
- Monitoring adapter for the tool actually in use.

## Phase 6: issue tracker and Slack

- Tracker adapter with Jira and Linear implementations; build whichever is in use first.
- Assigned issues as Asked items; priority and due date.
- Unseen mentions; commitment detection.

## Later

- Behaviors with proof badges and AI-decided detection.
- Codex parity for live events.
- Judgment model layer.
