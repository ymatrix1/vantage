# Architecture

> **Status:** proposed. Tech choices marked *tentative* aren't decided.

## Overview

```
Sources ──► Event store ──► Linker ──► Work items ──► Scorers ──► Surfaces
                                                                    │
                          user actions (confirm link, park, approve)┘
```

Everything runs locally. One background process (the daemon) ingests, links and scores. Surfaces read from it.

## Sources

| Source | How | Events |
|---|---|---|
| Claude Code | Hooks (`PostToolUse`, `Stop`, `Notification`, `PreCompact`, `SessionStart`) push events live; transcripts in `~/.claude/projects/**/*.jsonl` are backfilled | prompts, edits, commands with exit codes, todos, waiting, stop |
| Codex | Session logs in `~/.codex/sessions/YYYY/MM/DD/*.jsonl` | prompts, patches, commands |
| git | Local repos and worktrees | commits, branches, dirty files, merges, reverts |
| GitHub | `gh` API, polled | PRs, reviews, threads, review requests, deployments, Actions runs |
| CI/CD and monitoring | GitHub Actions and deployments first; monitoring through adapters (tool TBD) | deploys, post-deploy test results, alerts, incidents |
| Issue tracker: Jira or Linear | Jira: REST API or the Atlassian MCP. Linear: GraphQL API or the Linear MCP. Polled, behind one tracker adapter interface. | assigned issues, priority, due date, mentions, status transitions |
| Slack | API or the Slack MCP, polled | mentions, user commitments, thread replies |

Remote sources are polled at modest intervals. Nothing is pushed to them without an explicit user action.

## Event store

- Append-only table of normalized events, with source, kind, timestamp, payload and session id.
- Ingestion is idempotent (dedupe by source id) so backfill and live hooks can overlap.
- Unknown fields are kept in the payload so log format changes don't break ingestion.
- Storage: SQLite in `~/.vantage/` (*tentative*).

## Linker

See [work item model](specs/work-item-model.md).

- Deterministic anchors first (issue key, PR, branch or worktree, todo, Slack thread).
- Inferred links (LLM or a judgment model) only as suggestions until confirmed.
- Every link is visible and undoable.

## Scorers

See [lifecycle](specs/lifecycle.md) and [scoring](specs/scoring.md).

- Stage machine: evaluates gates on every linked event.
- Flag detectors: each a small pure function over the item's events.
- Priority, difficulty, spread, staleness.
- Scorers are pure and deterministic over the event log, so they can be replayed and tested with fixtures.

## Surfaces

- Local web UI served by the daemon (*tentative*: localhost page, can be pinned in a browser or side pane).
- Claude Code status line command reading from the daemon.
- OS toasts for red items.
- Later options: a VS Code panel or a desktop app mod.

## Judgment models (optional layer)

Used only where a fuzzy yes/no decision is needed:

- Does this command exercise the changed code?
- Does this commit address this review comment?
- Does this hunk add a business rule not in the request?
- Is this Slack message a commitment?

Candidates: a fast decision model (for example Jev from TypeSafe AI) or a small LLM with structured output. Hidden behind one interface, `judge(state, questions)`, with a deterministic fallback. Compare on ~100 labeled examples from real data before choosing.

## Privacy

- All data local by default.
- Any judgment or LLM call sends the minimum context (a hunk, a comment, a command), never whole transcripts.
- Must comply with company policy for code, issue tracker and Slack data; prefer zero-retention routes.

## Tech stack (tentative)

- TypeScript on Node for daemon, hooks and UI, to share types end to end.
- SQLite for storage.
- Vitest for tests, with recorded `.jsonl` fixtures.
