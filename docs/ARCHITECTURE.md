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

Remote sources are polled at modest intervals. Nothing is pushed to them without an explicit user action. How each source is listened to (push vs. pull, cursors, relay) is in [ingestion](specs/ingestion.md). Identity, config, secrets and daemon lifecycle are in [operations](specs/operations.md).

## Event store

- Append-only table of normalized events, with source, kind, timestamp, payload and session id.
- Ingestion is idempotent (dedupe by source id) so backfill and live hooks can overlap.
- Unknown fields are kept in the payload so log format changes don't break ingestion.
- Storage: **SQLite** in `~/.vantage/`, in write-ahead-log (WAL) mode so the UI can read while the daemon writes.

### Why SQLite, and where DuckDB fits

| | SQLite | DuckDB |
|---|---|---|
| Built for | Many small reads and writes (transactional) | Large scans and aggregates (analytical) |
| Vantage live workload | Small inserts, item updates, key lookups: a good fit | Slower for frequent single-row writes and updates |
| Concurrency | WAL: one writer, many readers across processes | One process holds the write lock |
| Expected size | Thousands to hundreds of thousands of events: sub-millisecond with indexes | Advantage appears at much larger scale |

- **SQLite** is the live store for events, links and work items.
- **DuckDB** is used for analysis: Phase 0 transcript mining (it queries `.jsonl` files directly), metrics and ad-hoc reports. It can read Vantage's SQLite file through its SQLite extension, so no export step is needed.
- Hooks never write to the database; they append to a spool file (see [operations](specs/operations.md#hooks-performance-budget)).

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

- Local web UI served by the daemon (*tentative*: localhost page, can be pinned in a browser or side pane). Pages: Focus, Track, Item, Journal, Inbox, Sources (see [UX](UX.md#pages)).
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
- SQLite for the live store (`better-sqlite3`, or Node's built-in `node:sqlite` if stable enough by then).
- DuckDB for analysis and Phase 0 measurement.
- Vitest for tests, with recorded `.jsonl` fixtures.

## Local security

A localhost page can be reached by other local programs and, through the browser, by malicious websites. So:

- The daemon binds to `127.0.0.1` only, never `0.0.0.0`.
- Every API and WebSocket request needs a per-install token. The token is stored in the OS credential store and handed to the UI through the URL fragment on launch, never in a query string.
- The server checks `Origin` and `Host` headers to block cross-site requests and DNS rebinding.
- No CORS headers. No endpoint changes data on a GET.
- The spool file and database are readable only by the user.

## Runtime (proposed)

- **Process model:** one daemon (ingest, link, score, serve) plus a browser UI. The status line is a tiny command that reads a small summary file the daemon writes, so it never waits on the daemon.
- **UI to daemon:** HTTP for queries and actions; one WebSocket for live updates.
- **UI framework:** to decide (open question Q17). Must be fast, keyboard-friendly and theme-token based.
- **Install:** to decide (Q18): an npm global package or a single binary. `vantage init` installs hooks; `vantage uninstall` removes them.

## Packaging and integration

Vantage must observe all the time, even when no agent is asking it anything. Skills and MCP servers only act when an agent calls them, so the core is a local daemon, and Claude Code features are the connectors, shipped together as one **Claude Code plugin**.

| Piece | Mechanism | Role | Phase |
|---|---|---|---|
| Core | Local daemon, SQLite, web UI on localhost | Always on; works with any agent | 1 |
| Capture | Claude Code **hooks** appending to the spool | Deterministic capture, every time | 1 |
| Proof gate | `Stop` **hook** (warn, optionally block) | Only hooks can stop an agent from finishing | 1 |
| Ambient status | Claude Code **status line** command | Always visible | 1 |
| Teach the method | **Skills** such as `a2v-proof` and `a2v-decide` | Shape how agents prove changes and record decisions | 1–3b |
| Agents talk to Vantage | **MCP server** (D48) | Read status, register behaviors, reference proof, propose decisions; never move a stage | 3b |
| Explain | Four layers: evidence-only by default; byproduct capture and an in-session slash command via skills and MCP; headless `claude -p` or `codex exec` only as an opt-in fallback | No separate AI call by default (D46) | 3b |
| Codex | Session file tailing, an `AGENTS.md` snippet, the same MCP server | Codex has no Claude-style hooks (research R3) | 1 |
| Install | One plugin (hooks, status line, skills, MCP config) plus `vantage init` for the daemon | One-step setup and uninstall | 1 |

**Principle:** hooks and evidence make results trustworthy; skills and MCP make agents cooperate. Vantage never depends on an agent choosing to cooperate.
