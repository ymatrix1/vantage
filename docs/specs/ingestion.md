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
| **GitHub** | Optional webhook relay (later) | **Notifications API** (`GET /notifications?all=true&since=<cursor>`), polled with `If-Modified-Since` and honoring `X-Poll-Interval` (observed: 60 s). It is a **wake-up signal**, not an event feed: one thread per PR, so a bump means "something changed". For each bumped PR thread, run a GraphQL fetch (reviews, review threads, commits, `statusCheckRollup`, timeline) and diff it against the stored snapshot. Slow reconcile polls cover what notifications miss (below). | Observed 2026-10-14 ([R4](../research/github.md)): every comment or review by someone else on the user's own PRs bumped the thread (784 of 784 PRs). The `reason` is **sticky per thread**, so it can't say what happened: `comment` means *you* commented and `state_change` means *you* changed state. `review_requested` and `mention` are reliable only until a later reason overwrites them. The payload has no review state. No `ci_activity` or `CheckSuite` notifications ever arrived. 304s don't count against the rate limit (docs). Needs a classic token (`repo` scope); fine-grained and App tokens don't work. |
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
| GitHub notifications | as `X-Poll-Interval` says (observed 60 s) | Free when nothing changed (304) |
| GitHub review requests (`review-requested:@me`) | 5–10 min | Notifications can lose or overwrite the reason, and Done threads vanish |
| GitHub CI rollup for open PRs | on every bump, then 2–5 min while checks are pending | CI results don't arrive as notifications |
| GitHub authored-PR catch-up | on start and hourly | Retention and missed pages |
| Jira, Linear | 2–5 min | Rate limits; latency rarely matters |
| Slack search (fallback only) | 2–5 min | Rate limits |
| git scan | 30 s for active worktrees, 10 min for others | Cheap locally |
| Monitoring | 2–5 min | Tool dependent |

Polling slows down when the machine is idle and speeds up when there's activity.

## GitHub adapter rules (from R4)

Findings and evidence: [GitHub research](../research/github.md).

- **Wake, then fetch.** A thread bump only says the PR changed. Fetch the PR with GraphQL and compare it to the stored snapshot to produce events: `review.submitted`, `review.requested` (including a re-request, a `ReviewRequestedEvent` after the user's last review), `comment.added`, `checks.changed`, `pr.pushed`.
- **Never read the event from `reason`.** Use it only as a hint for `directed_at_you`.
- **Bots are recognized by actor type**, not name. Bots wrote 93% of comments on the owner's PRs over 90 days.
- **CI is polled**, not notified, for open PRs and merge commits.
- **Review requests are reconciled** with a search on a slow schedule, because a thread can be missing (probably Done) or its reason overwritten.
- **Check every response for `X-GitHub-SSO`.** If present, mark the source degraded and show the authorization URL. A token that isn't SSO-authorized can make an org's threads silently absent. Behaviour of the notifications list itself is unverified.
- **Backoff.** Serialize requests; on `403` (secondary rate limit), `429` or `5xx` back off and retry; don't advance the cursor past a failed page.
- **Token.** Classic personal access token with `repo`; the `gh` OAuth token works too.
