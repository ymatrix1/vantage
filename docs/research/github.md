# Research: GitHub Notifications API coverage

> **Bean:** R4 (`vantage-ql2e`). **Checked:** 2026-10-14, read-only, with the `gh` CLI (2.76.2) on the repo owner's own account, plus GitHub's official REST docs. The API reported `X-GitHub-Api-Version-Selected: 2022-11-28`; the docs page shows version `2026-03-10`.
>
> **Privacy:** this file holds counts, rates and response shapes only. No repo names, PR titles, comment text, people or URLs (see the [privacy boundary](../../.agents/rules/privacy-boundary.md)). Raw responses and scripts stayed outside the repo.

## Question

[D22](../DECISIONS.md#d22-github-notifications-as-the-main-github-trigger) makes `GET /notifications` the primary GitHub trigger. Does it catch what the Reviewed stage and the [pings](../specs/pings.md) need: comments on my PRs, review requests, re-review requests, CI results and mentions? How does polling behave (interval, 304, rate limit), and how do org repos with SSO behave?

## Answer in one table

| Need | Arrives as a notification? | Evidence | What to do |
|---|---|---|---|
| Any new comment or review by someone else on **my PR** | **Yes, as a bump of the PR's thread.** 100% of 784 PRs with other-party activity had a thread whose `updated_at` was at or after the latest such event | [E5](#e5-own-pr-activity-vs-thread-updated_at) | Treat the bump as "something changed"; fetch the PR with GraphQL to learn what |
| What kind of event it was | **No.** One thread per PR; `reason` is sticky (`author` on 81% of those threads) and `latest_comment_url` is the PR itself for review events and pushes | [E3](#e3-reason-values-and-subject-shapes), [E6](#e6-thread-detail) | Diff against stored state; never infer the event from `reason` |
| Review request to me | **Mostly.** 13 of 27 PRs with a direct request carry `review_requested`; the rest show a later reason (`mention`, `comment`, `state_change`, `assign`) because the reason is overwritten; 4 have no thread at all | [E7](#e7-review-requests-and-re-requests) | Notifications as trigger, plus a periodic `review-requested:@me` reconcile |
| Re-review request to me | **Thread bumps, reason often hidden.** 3 of 3 re-requests bumped the thread; only 1 of 3 still showed `review_requested` | [E7](#e7-review-requests-and-re-requests) | Detect from GraphQL timeline (`ReviewRequestedEvent` after my last review), not from `reason` |
| Mention | **Yes** (`mention`, 45 threads). `team_mention` never appeared | [E3](#e3-reason-values-and-subject-shapes) | As designed; the reason can later be overwritten, so also scan new comment bodies if `owe_reply` needs it |
| CI results | **No, for this account.** 27 recent Actions runs by the user in one repo, 0 `ci_activity` threads and 0 `CheckSuite` subjects among 909 threads | [E8](#e8-ci-results) | Poll check runs per PR with GraphQL `statusCheckRollup` |
| Org repos with SAML SSO | **Could not verify the blocked case.** The 5 orgs seen all returned 200 and no `X-GitHub-SSO` header | [E9](#e9-orgs-and-sso) | Detect and surface the header; docs describe the failure mode |

## Evidence

### E1. Polling: interval, 304 and rate limit

```bash
gh api notifications -i                              # 200, Last-Modified, ETag, X-Poll-Interval
gh api notifications -i -H "If-Modified-Since: <Last-Modified value>"   # 304
gh api notifications -i -H "If-None-Match: <ETag value>"                # 304
gh api notifications -i -H "If-Modified-Since: Mon, 01 Jan 2024 00:00:00 GMT"   # 200
```

| Observation | Result |
|---|---|
| `X-Poll-Interval` | `60` on every response, 200 and 304 |
| `Cache-Control` | `private, max-age=60, s-maxage=60` |
| `Last-Modified` | Equals the newest thread's `updated_at` (the 13:24:02 thread gave `Last-Modified` 13:24:02) |
| `If-Modified-Since` with the current value | `304 Not Modified` on every request made with a current validator (more than 25) |
| `If-None-Match` with the current ETag | `304 Not Modified` |
| `If-Modified-Since` far in the past | `200` with the full list |
| A new thread update | The next `Last-Modified` moved forward and the old validator returned `200` again |
| Page size | Default 50; the first page's `Link` header listed 9 pages for 425 unread threads |

**Rate limit.** `X-RateLimit-Used` is shared with every other process using the same token, so it is noisy. Over a back-to-back test it rose by 3 across 20 `304`s and by 21 across 20 `200`s. That fits the docs' statement that a 304 leaves the rate limit untouched, but the counter can't prove it alone. `GET /rate_limit` reported `used: 0` throughout, so it was not useful for this check. Official docs (checked 2026-10-14): 304 "leav[es] your current rate limit untouched" and the interval can grow "in times of high server load".

### E2. Which tokens work

The docs say the notifications endpoints work with a **personal access token (classic)** and do not work with fine-grained tokens, GitHub App user tokens or installation tokens. The `gh` OAuth token (scopes `repo`, `read:org`, `workflow`, `gist`) worked; the docs list `notifications` or `repo` as the needed scope. Not tested: a token without `repo`.

### E3. Reason values and subject shapes

Queries run: default (unread), `all=true`, `participating=true`, `all=true&participating=true`, `since=`, `before=`. The widest query (`all=true&participating=true`) returned **909 threads** from 2026-07-14 to 2026-10-14, 427 unread.

| Reason | Threads | Notes |
|---|---|---|
| `author` | 679 | I created the thread; sticky, see below |
| `state_change` | 136 | Docs: "you changed the thread state"; observed on threads I authored, too |
| `mention` | 45 | |
| `comment` | 21 | Docs: **"you commented"**, not "someone commented on yours" |
| `review_requested` | 19 | |
| `assign` | 5 | |
| `manual` | 4 | Subscribed by hand |
| `team_mention`, `ci_activity`, `subscribed`, `security_alert`, `approval_requested`, others | 0 | Documented, never observed |

Subject types: `PullRequest` 874, `Issue` 34, `Discussion` 1. No `CheckSuite`, `Commit`, `Release` or `RepositoryDependabotAlertsThread`. 389 threads were in org-owned repos (5 orgs), 520 in user-owned repos.

**The reason is per thread and overwritten.** Docs: "the `reason` remains as `mention`, regardless of whether you're ever mentioned again." On my own PRs with other-party activity the reasons were `author` 634, `state_change` 116, `mention` 34 and **never `comment`**. The reason therefore says why the thread exists, not what just happened.

The `since` and `before` filters work (`since=<today>` returned 8 threads; `before=` returned a page). `all=true` alone returned 550 threads before one page failed with an HTTP 503; it succeeded on retry (see [Gaps](#gaps-and-risks)).

### E4. Review metrics for the user's own PRs

Window 2026-07-16 to 2026-10-14 (90 days). Source: GraphQL `search` on the user's authored PRs, 912 PRs (720 merged, 99 open, 93 closed unmerged, 107 currently draft). Reviews fetched up to 50 per PR (2 PRs hit the cap); comments up to 100 (none hit it).

| Metric | Result |
|---|---|
| Time to merge (merged PRs, from creation) | n=720; median **1.7 h**, p25 0.5 h, p75 8.6 h, p90 53 h |
| Time to first **human** response (review or comment by someone else) | n=396; median **0.74 h**, p25 0.4 h, p75 2.2 h, p90 4.4 h |
| Time to first response including bots | n=783; median **0.01 h**, p75 0.4 h, p90 2.0 h |
| PRs with at least one human (non-author) review | 393 of 912 (43%) |
| Human review submissions per human-reviewed PR | median 2, p90 3 |
| PRs with at least one `CHANGES_REQUESTED` | 63 of 393 human-reviewed PRs (16%); p90 of `CHANGES_REQUESTED` reviews per human-reviewed PR is 1 |
| PRs approved by a human | 93 |
| Human review states | `COMMENTED` 542, `APPROVED` 98, `CHANGES_REQUESTED` 80, `DISMISSED` 6 |
| Distinct human reviewers | 6; the top reviewer wrote 71% of human reviews |
| PRs with a bot review | 151 (reviews by bots: 1,055 vs 726 by humans) |
| Comments per PR, human (issue comments plus inline comments on human reviews) | mean 0.33, median 0, p90 1; 737 of 912 PRs have none |
| Comments per PR, bot | mean 4.13, median 2, p90 11, max 71; 179 PRs have none |
| Comments per PR, by the author themself | mean 0.63, median 0 |
| Human vs bot comment totals | 301 human, 3,763 bot: **bots write 93% of comments** |
| Review-request events per PR | mean 0.22; 786 PRs had none (reviewers mostly come from auto-assignment or by habit, not explicit requests) |

Method notes and limits:

- "Review rounds" is approximated as human review submissions and as `CHANGES_REQUESTED` count; there is no native round counter. A round that is only a pushed fix after a review isn't counted separately.
- "Time to first response" starts at PR creation, or at the last `ReadyForReview` event if later. Review **body** text is not counted as a comment, only inline comments, so human comment counts are a lower bound.
- "Human" means the GraphQL actor type `User`. An automation account registered as a user would count as human; not checked.
- A 90-day window of one person's PRs is a sample of one working style, not a general benchmark.
- Reviews the user wrote for others are in [E7](#e7-review-requests-and-re-requests): 38 PRs.

**Implication for the method:** a typical PR here has fast bot feedback, a human response within about 45 minutes, and merges in under 2 hours; "waiting" in `Reviewed` is usually short. Bot noise (93% of comments) means the `owe_reply` bot opt-out in the pings spec matters, and "blocking threads resolved" needs thread state, not comment counts.

### E5. Own-PR activity vs thread `updated_at`

Method: for each of 913 authored PRs, take the newest comment or review by anyone except the author (GraphQL), find the notification thread for the PR (matching repo and number), and test `thread.updated_at >= newest event - 2 minutes`.

| Group | PRs | Thread exists | `updated_at` caught the newest event |
|---|---|---|---|
| Any other-party activity | 784 | 784 (100%) | 784 (100%) |
| Human activity | 396 | 396 (100%) | 396 (100%) |
| Bot-only activity | 388 | 388 (100%) | 388 (100%) |

The other 129 PRs had no other-party activity; 121 of them had no thread (792 of 913 had one). This run re-fetched the PR list and got 913 PRs; [E4](#e4-review-metrics-for-the-users-own-prs) ran earlier and saw 912. Limits: this proves the **latest** event bumped the thread, not that each intermediate event did (one thread per PR collapses them), and the window starts at the oldest retained thread (2026-07-14). It doesn't test delay.

### E6. Thread detail

`GET /notifications/threads/{id}` returns the same keys as a list item (`id`, `last_read_at`, `reason`, `repository`, `subject`, `subscription_url`, `unread`, `updated_at`, `url`). It adds nothing. `subject` has only `title`, `type`, `url` and `latest_comment_url`. `GET /notifications/threads/{id}/subscription` returns `created_at`, `ignored`, `reason`, `subscribed`, `thread_url`, `url`.

`latest_comment_url` shapes across 550 threads: an issue-comment URL (55%), the **PR or issue URL itself** (41%; for PRs this means the last event was a review, review comment or push, not an issue comment), or `null` (4%). It never points at a review, so **review state (approved, changes requested) is not in the notification**.

So the "targeted fetch" in D22 is mandatory: for every bumped PR thread, fetch reviews, review threads, commits and checks with GraphQL.

### E7. Review requests and re-requests

Sample: 38 PRs (not authored by the user) where the user reviewed or was asked to review, created in the window.

| Check | Result |
|---|---|
| PRs with a direct `ReviewRequestedEvent` for the user | 27; team requests: 0 |
| Thread reason on those 27 | `review_requested` 13, `mention` 6, `comment` 2, `state_change` 1, `assign` 1, no thread 4 |
| PRs where the user was re-requested after their first review | 3; all 3 threads bumped past the re-request time; reasons `review_requested` 1, `mention` 2 |
| PRs with new commits after the user's review | 10; all 10 have a thread |
| PRs with no thread at all | 5, **all merged**, 4 of them with the user's approval |
| Open PRs in the sample | 6, all 6 with a thread, reasons `review_requested` 4, `comment` 1, `assign` 1 |

The five missing threads are probably notifications the user marked Done after merging. That is a guess: I didn't verify that a Done thread disappears from the list, and I didn't create one (read-only). The lesson holds either way: **no thread does not mean no review request**, so an item must also be discoverable by search.

### E8. CI results

- 909 threads: 0 with `reason: ci_activity`, 0 with subject type `CheckSuite`.
- In one repo the user had 27 recent workflow runs (25 `push`, 2 `pull_request`; 25 success, 2 failure), so there were CI results to notify about.
- Docs: `ci_activity` means "a GitHub Actions workflow run that you triggered was completed", and `approval_requested` covers deployment approvals. The Actions notification toggle lives in the user's web notification settings; there's no API to read it, so I couldn't tell whether it is off or the runs simply didn't notify.
- GraphQL `statusCheckRollup` works from the same token: one open PR returned state `FAILURE` with 3 contexts (2 `CheckRun`, 1 `StatusContext`).

Conclusion: do not rely on notifications for CI. Poll the rollup for the head commit of each open PR.

### E9. Orgs and SSO

- 5 orgs appeared in the threads (389 threads); the user belongs to 2 orgs according to `GET /user/orgs`. A thread's repo can belong to an org the user is not a member of (public repos).
- For one thread in each org, `GET <subject.url>` returned `200` and **no `X-GitHub-SSO` header** (the header name appears in `Access-Control-Expose-Headers`, which is not the header itself; an early check made that mistake).
- So I could not observe an SSO-blocked org. The docs (authentication page, checked 2026-10-14) say: for a classic token not authorized for an org that enforces SAML SSO, a request to that org's resources can return `404` or `403`; on `403` the `X-GitHub-SSO` header carries a URL to authorize the token; and when a request spans multiple orgs, results from SSO-protected orgs **are silently left out**, with `X-GitHub-SSO` listing the org ids.
- Whether the notifications list itself omits threads from an unauthorized SSO org was **not verified**. The multi-org rule suggests it does, which would look like "no notifications" for that org.

## Gaps and risks

| Gap | Effect | Mitigation |
|---|---|---|
| One thread per PR, sticky reason | Can't tell comment from review from push from re-request | Snapshot per PR in the store; diff on each bump |
| No review state in the payload | `changes_requested` and `approved` need a fetch | GraphQL `reviews`, `reviewThreads { isResolved }`, `reviewDecision` |
| No CI notifications (this account) | Proven-after-review, Shipped and checks miss CI | Poll `statusCheckRollup` and Actions runs for open PRs and merge commits |
| Threads can vanish (Done, probably) | Review requests can be missed | Reconcile with `review-requested:@me` search or GraphQL on a slow schedule |
| SSO block may hide orgs silently | A missing org looks quiet | Check `X-GitHub-SSO` on every response; show a health warning in `SourceHealth` |
| Classic PAT only | Fine-grained tokens and Apps can't read notifications | Setup docs: classic token with `repo` (or `notifications`); `gh auth token` works |
| Secondary rate limit | A burst of search requests (a 910-result pagination, then two more searches) returned `403` "secondary rate limit"; recovered after about 3 minutes | Serialize requests, pause between pages, back off on 403 and 429 |
| Transient 5xx | One 503 mid-pagination of `all=true` | Retry with backoff; never advance the cursor on a failed page |
| Retention | Oldest thread seen was 2026-07-14 (3 months) | Backfill from GraphQL, not notifications; the cursor must tolerate gaps |
| Page size | Paging 18 pages for 909 threads is slow; only matters on first sync | Use `since=` after the first sync |

## What to poll instead (or as well)

| Need | Source | Cadence |
|---|---|---|
| Is anything new? | `GET /notifications` with `If-Modified-Since`, `all=true`, `since=<cursor>` | `X-Poll-Interval` (60 s) |
| What changed on a bumped PR | GraphQL: reviews, review threads, commits, `statusCheckRollup`, timeline items | On bump, one query per PR |
| CI of open PRs | `statusCheckRollup` on the head commit | On bump, plus every 2–5 min while any PR has pending checks |
| Review requests to me | GraphQL or search `review-requested:@me is:open` | Every 5–10 min |
| PRs I authored (catch-up) | GraphQL search `author:@me is:pr updated:>=<cursor>` | Start-up and hourly |

## Implications

1. **Ingestion spec:** the notification list is a *wake-up signal*, not an event feed. Rewrite the GitHub row and add a reconcile step; correct the meaning of `comment` and `state_change`.
2. **Pings:** `owe_reply` from a review request or mention can't rely on `reason`. It needs the GraphQL pass, and bot authors must be recognized from the actor type (bots are 93% of comments).
3. **Lifecycle:** Reviewed sub-states come from `reviews`, `reviewThreads` and the timeline, never from the notification. A re-request is a `ReviewRequestedEvent` after the user's last review.
4. **CI and Shipped/Verified:** need their own poll (R5 covers deploys).
5. **D22 stays valid as a trigger** but its Impact is now concrete: see proposal P4 in [DECISIONS](../DECISIONS.md#proposed-pending-confirmation).

## Not verified

- Delay between an event and the thread bump (no events created, read-only).
- That a Done thread disappears from the list.
- Behaviour for an SSO-enforcing org with an unauthorized token.
- Whether `ci_activity` notifications would arrive with the web setting on.
- `team_mention` and team review requests (none present).
- Behaviour on GitHub Enterprise Server.

## Follow-ups

- Measure event-to-bump delay during Phase 1 dogfooding (log both timestamps).
- Add a `vantage doctor` check for the token type, scopes, `X-GitHub-SSO` and the Actions notification setting hint.
