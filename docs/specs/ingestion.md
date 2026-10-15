# Spec: ingestion and triggers

How Vantage hears about things happening in each source.

## Principles

1. **Pull is the backbone; push is an accelerator.** A laptop sleeps, restarts and goes offline. Every source must support catch-up from a stored cursor, so nothing is lost while Vantage isn't running. Push channels only make updates arrive faster.
2. **No public endpoint by default.** Local-first means nothing listens on the internet. Webhooks need a relay, which is optional and comes later.
3. **Never slow down or break an agent.** Claude Code hooks must return in under 100 ms and must succeed even when the daemon is down. Spool hooks are registered with `async: true` so they never block the session (decision D59); only the `Stop` gate runs synchronously.
4. **Idempotent.** Each event has a stable source id; replays and overlaps between push and pull are deduplicated.
5. **Honest freshness.** Each source shows "last synced" in the UI. A stale source is shown as stale, never as quiet.

### Stop hook

`Stop` is the only synchronous hook. The same command appends a `session.stopped` event (payload `stopHookActive`, `cwd`) to the spool, then runs the proof gate ([proof](proof.md#the-gate), D73). Local medians, 21 runs, built JS: spool-only hook 80 ms, Stop with no daemon store 84 ms, Stop reading a store 85 ms (max 106 ms).

### Hook latency

The registered command is the native binary built from `packages/hooks-native` (D72), or the built `packages/hooks/dist/src/bin.js` run by `node` (D67) when no native binary is found (the installer looks for the per-OS package, then a local cargo build, then falls back to Node: D80). The binary hands `Stop` to that Node entry (D76). Measured on the dev laptop (Windows 11, Node 24.6, 40 runs interleaved after 3 warm-ups, spool on local disk; numbers only):

| Launcher | Median | p95 |
|---|---|---|
| `node -e ''` (floor) | 82 ms | 97 to 107 ms |
| `node src/bin.ts` (before) | 126 to 133 ms | 167 to 181 ms |
| `node dist/src/bin.js` (after) | 95 to 99 ms | 130 ms |
| Go binary (spike, not shipped) | 32 to 33 ms | 41 to 47 ms |
| Rust binary (`packages/hooks-native`, 0.25 MB) | 29 ms | 36 ms |
| `node dist/src/bin.js`, same run (control) | 101 ms | 134 ms |
| `node -e ''`, same run (floor) | 86 ms | 110 ms |
| `Stop` through the Rust binary, then Node (D76) | 123 ms | 148 ms |
| `Stop` through `node dist/src/bin.js` alone | 103 ms | 130 ms |

Node's start-up alone is most of the budget, so the median is just under 100 ms and p95 is not. The automated test asserts a CI ceiling of 750 ms median (shared runners are slow); the 100 ms figure is a local measurement, not a CI gate.

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
| **Claude Code** | Hooks (`SessionStart`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `Notification`, `Stop`, `PreCompact`, `SessionEnd`) append one JSON line to a local spool file. Payload shapes: research [R2](../research/claude-code-hooks.md) | Tail transcripts in `~/.claude/projects/**/*.jsonl` by byte offset | Hooks only append to the spool; the daemon reads it. If the daemon is down, nothing is lost. |
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
| Agent (keyed by Claude Code `session_id` and `prompt_id`) | `session.started`, `session.derived`, `task.list.updated`, `subagent.run`, `prompt.submitted`, `file.edited`, `command.ran` (with exit code), `todo.updated`, `session.waiting`, `session.stopped`, `session.compacted`, `session.ended`. `command.ran` comes from `PostToolUse` (success) and `PostToolUseFailure` (failure); `session.waiting` from `PermissionRequest` and `Notification` (`permission_prompt`, `idle_prompt`, `elicitation_dialog`) |
| git | `commit.created`, `branch.checked_out`, `merge.completed`, `revert.created`, `worktree.scanned` (dirty files) |
| Review | `pr.opened`, `pr.updated`, `review.submitted`, `review.requested`, `thread.commented`, `thread.resolved`, `pr.merged`, `pr.closed` |
| Ship | `deploy.started`, `deploy.succeeded`, `deploy.failed`, `check.passed`, `check.failed`, `alert.fired`, `alert.resolved`, `incident.opened` |
| Tracker | `issue.assigned`, `issue.updated`, `issue.commented`, `issue.transitioned` |
| People | `mention.received`, `message.sent_by_user`, `reply.received`, `reaction.added` |

### Shell writes and repo membership

`file.edited` from a shell command counts as work on the item, so scratch output must not produce one (D70). At ingest, each write target the detector names is read against the session `cwd` and classified:

| Target | Result |
|---|---|
| Resolves under the repo root (`repoRoot`, else `cwd`) | Listed in `file.edited.paths` |
| Resolves outside it (`/tmp/x.log`, `../other/x`, another drive) | Not an edit. Listed in `command.ran.outsidePaths` |
| Can't be read from the text (`~/x`, `$VAR/x`), no `cwd`, or the command runs `cd` first | Counted as an edit, as before (nothing ruled out) |
| Opaque write (`sed -i`, `apply_patch`, scripted write) with no named target | Counted, unless a known `repoRoot` shows the `cwd` is outside it; then `command.ran.opaqueOutsideRepo: true` and no `file.edited` |

- A command with an inside and an outside target emits one `file.edited` with only the inside paths; the outside ones stay on `command.ran`. A commit still emits `file.edited` with `via: shell-commit`.
- Both payload fields are additive. No event kind was added, so consumers that read `file.edited` only see in-repo work, and nothing is lost: the outside paths stay on the command event.
- Matching is lexical: separators, `.` and `..` are normalized, Windows paths (drive letter, either separator, Git Bash `/c/...`) compare case-insensitively, POSIX paths case-sensitively. Symlinks and junctions are not followed.
- The daemon passes `repoRoot` at ingest: the longest worktree root the git scanner has reported (`worktree.scanned.worktree`) that contains the session `cwd`, compared lexically. When the scanner has not reported a containing root yet (or no git scan is registered), the root stays the `cwd`, so a subdirectory session's `../sibling/x` reads as outside. That is the conservative reading; events already stored keep the classification they were ingested with. The hook itself never resolves a root (D67 budget).

### Derived sessions

`session.derived` is written by the transcript backfill, not by a hook, because no hook payload names a parent (measured: [session lineage](../research/session-lineage.md)). A session file is named by its session id. When the file's first lines carry another `sessionId`, Claude Code copied the parent's history into it. The backfill reads every line of the file (the copied history is usually older than the 14-day window), takes the id on the last copied line as the parent and emits one event: `sourceId` `cc:lineage:<child>:<parent>`, `timestamp` of the child's first own line, payload `{parentSessionId, lineage: "continuation", signal: "transcript-history"}`. The kind is refined at link time from the `SessionStart` `source` (`resume`, `fork`, `clear`, `compact`). Files under `subagents/` are skipped: their lines carry the parent's `sessionId`, and `agentId` is added to the payload of their `file.edited` and `command.ran` events (and of hook events with `agent_id`). Replays are safe: the copied lines' own events dedupe on their tool and prompt ids.

### Task lists and sub-agent runs

Two kinds that feed the item read model (D96, proposed). Both come from the transcript backfill and, for task lists, from the hook too.

- **`task.list.updated`** is a `TodoWrite` call: the whole list is in the call. The payload keeps only `{total, pending, inProgress, completed}` and, when text capture is on, `current`: the cleaned text of the first `in_progress` item (URLs, paths, emails and secret-looking tokens removed, one line, at most 80 characters). No other todo text is stored. `sourceId` is `cc:tool:<tool_use_id>:todos`, so the hook and the transcript dedupe. Capture of `current` follows the same switch as request titles (`item_titles_from_requests`); with it off the counts stay and `current` is absent. `TaskCreate` and `TaskUpdate` are not read yet (the task id sits in the create result; see the research note).
- **`subagent.run`** is one slice of a sub-agent run: per sub-agent file and ingest batch, `{agentId, startedAt, endedAt, tools}` where `tools` counts the `tool_use` blocks in the batch. `sourceId` is `cc:subagent:<agentId>:<first line uuid>`, so a replay of a batch dedupes and a run read in several batches adds up. Sub-agent lines carry the parent's `sessionId`, so the run belongs to the parent's session. The tool-use counts and durations of the run result are not used: 688 of 730 runs are async and carry no totals.

### Branch on tool events

A transcript line carries `gitBranch`, but the tool calls read from it had no branch, so the linker could place them only through a scanned worktree (D92, proposed). Now each `file.edited` and `command.ran` from a transcript carries `payload.branch`: the line's own `gitBranch`, else the nearest earlier line of the same session in the same read. Each call takes the branch at its own line, so a mid-session switch splits the session (D54). `HEAD` (detached) is no branch, and later lines without the field stay detached; no `gitBranch` anywhere leaves the key out. The prompt event follows the same reading. The field is additive.

Tool calls that were stored first by a hook (which has no branch) or before this change keep their payload: events stay immutable. Instead the transcript pass records the branch beside the event in `event_branches (source, source_id, branch)`, for every call it sees, stored or not. `loadEvents` fills `payload.branch` from that table when the stored payload has none, so the linker and the stage machine read one field. The first value wins. A one-shot step, `backfillEventBranches` (marker cursor `backfill:event-branches:v1`), re-reads every transcript inside the 14-day window from the start and records the branches for calls already stored; later passes record them as they ingest. Calls whose transcript is older than the window keep no branch.

### Test run counts

For a shell command the daemon also reads the tool output the hook spooled (`tool_response`, or a transcript `tool_result`) and, when it recognises a runner's own summary, adds `command.ran.result: {run, passed, failed, skipped}` (`run` = passed + failed + skipped; errors count as failed). Recognised: vitest, jest, pytest, `go test` (`-v` per-test lines, or every package reporting no tests), `dotnet test`. Only numbers are kept, never output text. Unrecognised output leaves `result` absent, which the stage machine reads as "unknown", not zero. `go test` without `-v` prints no counts, so a plain `ok` package is unrecognised.

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
