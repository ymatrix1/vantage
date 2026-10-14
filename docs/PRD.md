# PRD: Vantage

## 1. Summary

Vantage is a local-first personal tool that shows the true state of a developer's work when much of it is done by AI coding agents running in parallel. It answers three questions at a glance, with as little text as possible:

1. **What needs me now?**
2. **Where is everything, really?** Based on evidence, not agent claims.
3. **Is this piece of work right?** Judged by behavior and proof, not by reading diffs.

The end goal is less stress from constant change: fewer things to remember, fewer things to re-check, and an explicit "safe to ignore" for everything else.

## 2. User

Primary user: one developer (the author) who:

- runs several Claude Code and Codex sessions in parallel, often in git worktrees;
- works from Jira or Linear issues, GitHub PRs with human and bot reviewers, and Slack;
- ships to production systems and data pipelines that need checking after deploy;
- loses track of what was asked, built, proven, shipped and verified across sessions and days.

Team features are out of scope for now. The design should not prevent them later.

## 3. Pains

| # | Pain | Example |
|---|---|---|
| P1 | **Lost state** | After `/compact`, `/clear` or a night's sleep, it's unclear what is committed, uncommitted, or only discussed. |
| P2 | **Unproven claims** | An agent says "done, fixed and optimized" without running a test or checking data. |
| P3 | **Ghost and forgotten work** | Ideas discussed in a chat, or promised in Slack, that never became code. |
| P4 | **Silent decisions** | The agent invents business rules (retry limits, grace periods, cascades) nobody asked for. |
| P5 | **Thrashing** | Edit → fail → edit → fail loops instead of building a reproduction harness. |
| P6 | **Review loop** | Review comments, fixes, re-review requests and "claimed fixed" replies are hard to track across PRs. |
| P7 | **Sessions waiting on me** | A session sits on a permission prompt or question while attention is elsewhere. |
| P8 | **Unseen mentions** | Slack, Jira and Linear mentions, and review requests, never answered. |
| P9 | **No priority or effort view** | Everything looks equally urgent; no sense of difficulty or how effort was spread. |
| P10 | **Text overload** | Reconstructing state means reading long transcripts and diffs. |
| P11 | **Stress from constant change** | Many small updates, none batched, none marked safe to ignore. |
| P12 | **Merged is not working** | Code ships but nobody checks it works in production; regressions surface days later. |

## 4. Goals

- G1. One card per piece of work, with status derived only from evidence.
- G2. A Focus view that shows today's top 3 items and batches everything else.
- G3. Flags for the specific risks above (see [lifecycle spec](specs/lifecycle.md#flags)).
- G4. Each card shows priority, difficulty and how effort spread across sessions, agents and review rounds.
- G5. Short behaviors (Given/When/Then style) with a proof badge each, so the user judges behavior instead of diffs.
- G6. Post-ship verification: deploy, post-deploy checks and a monitoring window before a card counts as done.
- G7. Local-first: all data stays on the machine by default.

## 5. Non-goals (for now)

- Replacing Claude Code, Codex or session managers (Agent View, Pane, Conductor). Vantage reads from them; it does not run agents.
- A chat UI or multi-model wrapper.
- Team dashboards, multi-user sync, billing.
- Two-way issue tracker sync (Jira or Linear). Read first; write-back only on explicit user action.
- Cursor and web-chat (chatgpt.com, claude.ai) ingestion.
- Being a monitoring system. Vantage links to existing monitoring and reads its signals.

## 6. Core concept

See [lifecycle spec](specs/lifecycle.md). Summary:

- **Stages:** Asked → Built → Proven → Reviewed → Shipped → Verified.
- **Proof expires:** a linked edit after proof moves the card back to Built.
- **Review loop** stays inside Reviewed with sub-states.
- **Regressions after ship** spawn a linked follow-up card; the original keeps its history and a red flag.
- **Parked** is an explicit user choice that stops nagging.
- **Flags** sit on any card; they are not stages.

## 7. Features by pain

| Pain | Feature |
|---|---|
| P1 | Board with stage columns; "moved since yesterday" markers |
| P2 | Proof gate via Claude Code `Stop` hook (warn first, block optionally); Proven requires post-edit proof |
| P3 | Ghost and commitment detection; `forgotten` flag after N days |
| P4 | "AI decided alone" behaviors with approve or change |
| P5 | `thrashing` flag from edit/fail patterns |
| P6 | PR review state machine; `claimed_fixed` detector |
| P7 | Needs-you queue; toasts for red items only |
| P8 | Unseen mentions grouped and attached to cards |
| P9 | Computed priority, difficulty (estimate and actual), spread bar |
| P10 | 1-line rows, about 140 characters max per card text, transcripts hidden by default |
| P11 | Top 3 focus, batched digest at chosen times, explicit "safe to ignore" count |
| P12 | Verified stage; `shipped_unverified` and `regression` flags; follow-up cards |

## 8. Success metrics

Measured on the author's own usage:

- Opens Vantage daily without prompting, after 2 weeks of use.
- Morning catch-up under 2 minutes (baseline to be measured).
- Share of sessions ending with unproven edits drops (baseline from transcript mining).
- No "I forgot about that" item older than 7 days that Vantage didn't flag.
- Fewer re-review rounds caused by unaddressed comments.
- Regressions linked to their originating work item within a day.

**Kill rule:** if it isn't used daily two weeks after the first usable phase, stop or pivot.

## 9. Constraints and risks

- **Company data.** Slack, Jira or Linear, code and monitoring are company data. Store locally; any LLM call must respect company policy and prefer zero-retention routes.
- **Wrong links destroy trust.** Every inferred link must be visible and undoable.
- **Notification fatigue.** Interrupt only for red items.
- **Format drift.** Claude Code and Codex log formats change; ingestion must tolerate unknown fields.
- **Scope.** Large. Build in layers (see [roadmap](ROADMAP.md)).
