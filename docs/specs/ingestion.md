# Spec: ingestion and triggers

How Vantage hears about things happening in each source.

## Principles

1. **Pull is the backbone; push is an accelerator.** A laptop sleeps, restarts and goes offline. Every source must support catch-up from a stored cursor, so nothing is lost while Vantage isn't running. Push channels only make updates arrive faster.
2. **No public endpoint by default.** Local-first means nothing listens on the internet. Webhooks need a relay, which is optional and comes later.
3. **Never slow down or break an agent.** Claude Code hooks must return in under 100 ms and must succeed even when the daemon is down.
4. **Idempotent.** Each event has a stable source id; replays and overlaps between push and pull are deduplicated.
5. **Honest freshness.** Each source shows "last synced" in the UI. A stale source is shown as stale, never as quiet.

## Adapter contract

Every source is an adapter with the same shape:

```ts
interface SourceAdapter {
  id: string;                              // "github", "slack", ...
  catchUp(cursor: Cursor | null): AsyncIterable<SourceEvent>; // pull since cursor
  listen?(emit: (e: SourceEvent) => void): Stoppable;          // optional push
  health(): SourceHealth;                  // last sync, errors, rate limit
}
```

The daemon runs `catchUp` on start and on a schedule, runs `listen` when available, and stores the cursor after each committed batch.

## Sources

| Source | Push (fast path) | Pull (backbone) | Notes |
|---|---|---|---|
| **Claude Code** | Hooks (`SessionStart`, `PostToolUse`, `Notification`, `Stop`, `PreCompact`) append one JSON line to a local spool file | Tail transcripts in `~/.claude/projects/**/*.jsonl` by byte offset | Hooks only append to the spool; the daemon reads it. If the daemon is down, nothing is lost. |
| **Codex** | File watcher on `~/.codex/sessions/` | Tail new or grown rollout files by byte offset | No hook system needed for v1. |
| **git** | Global `post-commit`, `post-checkout`, `post-merge` hooks via `core.hooksPath` that append to the spool (chaining any repo hooks); file watcher on `.git/HEAD` and refs | Periodic scan of registered repos and worktrees: `git status`, `git log` since cursor | Dirty-file state comes from scans; it has no event. |
| **GitHub** | Optional webhook relay (later) | **Notifications API** (`GET /notifications`), polled with `If-Modified-Since` and honoring the `X-Poll-Interval` header (usually 60 s). Then targeted GraphQL fetches for the threads it reports. | Notifications are already "things relevant to me": `review_requested`, `mention`, `comment`, `author`, `assign`, `ci_activity`, `state_change`. Conditional requests that return 304 don't count against the rate limit. They also carry an unread flag, which gives "seen" state for free. |
| **CI/CD** | Same as GitHub | Actions runs and deployments for registered repos, via GraphQL or REST, keyed on merge commits | Feeds Shipped and the post-deploy checks for Verified. |
| **Slack** | **Socket Mode**: a Slack app opens a websocket from the laptop, so there's no public URL. It subscribes to message events on behalf of the user. | `search.messages` with a user token for `<@USER_ID>` mentions and the user's own messages since the cursor | Needs a Slack app installed in the workspace, which probably needs admin approval. Fallback if refused: the Slack connector through a scheduled Claude agent run, with lower fidelity. |
| **Jira** | Webhooks via relay (later; needs admin) | JQL polled every 2–5 min: `updated >= -10m AND (assignee = currentUser() OR reporter = currentUser() OR watcher = currentUser())`, then fetch comments and changelog for changed issues | Mentions are found by scanning new comments for the user's account id. |
| **Linear** | Webhooks via relay (later) | GraphQL: the user's `notifications` inbox plus issues updated since the cursor | Linear notifications include read state. |
| **Monitoring** | Webhooks via relay (later) | Poll the tool's API for alerts or issues tagged with registered services | Tool still to be decided (see open questions Q5). |

## Webhook relay (optional, later)

For lower latency on GitHub, Jira, Linear and monitoring:

- A tiny hosted endpoint (for example a Cloudflare Worker plus a queue) receives webhooks, verifies signatures, stores them briefly, and the daemon pulls them over an authenticated connection.
- **Tradeoff:** company data passes through a hosted service. Off by default. Needs company approval.
- Polling stays on even with the relay, as the source of truth for catch-up.

## Event catalog (v1)

Normalized `kind` values. The payload keeps the raw source fields.

| Group | Kinds |
|---|---|
| Agent | `session.started`, `prompt.submitted`, `file.edited`, `command.ran` (with exit code), `todo.updated`, `session.waiting`, `session.stopped`, `session.compacted` |
| git | `commit.created`, `branch.checked_out`, `merge.completed`, `revert.created`, `worktree.scanned` (dirty files) |
| Review | `pr.opened`, `pr.updated`, `review.submitted`, `review.requested`, `thread.commented`, `thread.resolved`, `pr.merged`, `pr.closed` |
| Ship | `deploy.started`, `deploy.succeeded`, `deploy.failed`, `check.passed`, `check.failed`, `alert.fired`, `alert.resolved`, `incident.opened` |
| Tracker | `issue.assigned`, `issue.updated`, `issue.commented`, `issue.transitioned` |
| People | `mention.received`, `message.sent_by_user`, `reply.received`, `reaction.added` |

## Polling budget

| Source | Default interval | Why |
|---|---|---|
| GitHub notifications | as `X-Poll-Interval` says (about 60 s) | Free when nothing changed (304) |
| Jira, Linear | 2–5 min | Rate limits; latency rarely matters |
| Slack search (fallback only) | 2–5 min | Rate limits |
| git scan | 30 s for active worktrees, 10 min for others | Cheap locally |
| Monitoring | 2–5 min | Tool dependent |

Polling slows down when the machine is idle and speeds up when there's activity.
