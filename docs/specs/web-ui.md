# Spec: web UI

> **Terms:** [daemon](../GLOSSARY.md#daemon), [flag](../GLOSSARY.md#flag), [Needs you](../GLOSSARY.md#needs-you), [worktree](../GLOSSARY.md#worktree). Plain-language definitions are in the [glossary](../GLOSSARY.md).

Pages and layouts are in [UX](../UX.md). This spec covers what the UX doc doesn't: navigation, screen states, keyboard, and the API between UI and daemon. Static mockups: [docs/mockups/](../mockups/index.html). Framework: Svelte ([D62](../DECISIONS.md#d62-svelte-for-the-web-ui)).

## Navigation

- A left rail with the six pages: Focus (`g f`), Track (`g t`), Journal (`g j`), Inbox (`g i`), Sources (`g s`). Item opens from any row or card.
- A top bar with the context switch (Work, Personal, All), a search box, and the red-item badge.
- Item opens as a side panel over Track, so the list stays visible; `Esc` closes it. Its URL is shareable locally (`/item/<id>`).
- Every page keeps its filters in the URL, so refresh and back work.

## Screen states

Every page and panel handles all five states.

| State | What the user sees |
|---|---|
| **Loading** | Skeleton rows in the final layout; no spinners longer than 300 ms without a skeleton |
| **Empty** | An invitation, not an apology: "No work yet. Run `vantage init` in a repo to start." Focus when calm: "Nothing needs you. 9 items safe to ignore." |
| **Error** | One line saying what happened and what to do: "Can't reach the Vantage daemon. Start it with `vantage start`." |
| **Stale source** | A thin banner on affected rows or pages: "GitHub not synced for 20 min" with a link to Sources. Phase 1: "Rows not refreshed since N min ago. Is the daemon running?" when the last stage pass is over 5 minutes old |
| **Partial** | Data from healthy sources shows normally; missing parts are hollow, never guessed |

## Keyboard map

| Keys | Action |
|---|---|
| `Ctrl+K` | Command palette (every action is listed there) |
| `g f` / `g t` / `g j` / `g i` / `g s` | Go to Focus, Track, Journal, Inbox, Sources |
| `j` / `k` | Next / previous row (rows of collapsed groups are skipped) |
| `Enter` | Open item |
| `Esc` | Close panel or palette |
| `/` | Focus search (`Esc` leaves the box) |
| `[` / `]` | Previous / next page of the list |
| `p` | Pin or unpin item |
| `z` | Park item |
| `r` | Resume with context |
| `a` | Ask for proof |
| `e` | On Track: open every row of the selected group. Elsewhere (later): explain the selected item, project or week |
| `1` / `2` / `3` / `4` | Group Track by attention / repo / stage / no grouping (proposed D85; no `g` chords, since `g s` is Sources) |
| `?` | Show this map and the dot legend |

## Track layout

Proposed D100. Each level answers one question; the evidence is one click away.

| Level | Question | What it shows |
|---|---|---|
| L0 header | How is it going? | One sticky line: "Last 7 days: 98 in progress, 20 need you (12 unproven, 5 stuck), 37 older", the date range and a Stale or Offline badge. Each number filters the list when clicked |
| L1 projects | Which project? | The default grouping. One collapsible section per repo (`owner/repo` from the git remote, never a worktree folder) with "N need you, M in progress, last active X ago" and a repo link; most "needs you" first, then most recent |
| L2 rows | Which item? | Title: ticket title or key, else the branch without `claude/` and a random six-hex suffix, else the fallback title. Subtitle: branch and a short time (never the worktree folder). The six dots with the stage label, the flag reason in words, a "N sessions" chip when above 1 and a branch link icon |
| L3 detail | Why, and what is behind it? | Inline under the row (click or `Enter`; `Esc` closes all; `e` opens every row of the group): why it needs you, sessions (derived ones nested), files touched by base name, branch, last commit and folder, stage history, proofs, linked events, and actions: open branch, open last commit, copy branch name, copy the `cd` command |

**Links** come only from the remote, the branch and a hex sha: `https://host/owner/repo`, `/tree/<branch>`, `/commit/<sha>`, each segment escaped, `target="_blank"`, `rel="noopener noreferrer"`. No PR or ticket link is invented: the slots wait for the GitHub source and the tracker (D90). A path with a quote, `$` or a backtick gets no `cd` button.

**Pager and toolbar.** The summary line and the toolbar are sticky. The pager ("26 to 50 of 312", first, previous, next, last) shows above and below the list; the page-size selector is at the bottom. `[` and `]` page.

**Header counts** need totals for the same filters grouped by attention, so the page makes a second request (`group=attention&pageSize=1`) next to the list request.

**Known limits.** The API pages rows, not projects, so a project shows only its rows on the current page and projects are ordered by those rows. Group totals include the rows the page folds into "Conversations without code".

## Track controls

Built in `packages/ui` (`vantage-4ty4`, proposed D85). The request mirrors the `GET /api/track` query contract; the response adds `page`, `facets` and `groups` with `id`, `label`, `total` and the current page's rows.

| Control | Behaviour |
|---|---|
| Search | Title, repo and branch, at most 80 characters, sent after a 250 ms pause or on `Enter`; typing replaces the history entry instead of adding one |
| Filters | Chips with live counts from `facets`: since (24 h, 7 d, 30 d, all), has code edits, repo, branch, stage, proof, flag. Each count is computed without its own filter, so a chip shows what choosing it would give. Active filters show as removable chips; "Clear all filters" keeps sort, group and page size |
| Sort and group | Sort by activity, stage, title, repo or flags, with direction (title and repo start A to Z, the rest newest or highest first). Group by attention, repo, stage or none |
| Groups | Real headings with the group total; "(N on this page)" when paging splits a group. Each collapses. Grouped by attention, the page folds rows without code edits into "Conversations without code" and, for 30 days or all time, rows older than 7 days into "Older" (both collapsed by default). A row shows "N sessions" when the daemon sends a `sessionCount` above 1 |
| Pagination | First, previous, next, last, "26 to 50 of 312", and 25, 50 or 100 per page. Any filter, sort or group change returns to page 1; a page past the end lands on the last page |
| Flags | Each flag shows its `reason` text on the row |

**Dots, label and legend.** Each row shows the six dots and, beside them, a short label from the item's own fields: "Asked", "Built · no proof yet" (or expired, failed, weak), "Built · needs you", "Built · docs only, proof not required", "Proven · L1". Below the `md` breakpoint the label moves next to the repo line; the dots never hide. "What the dots mean" in the page header (and `?`) opens a non-modal legend: the six stages with their question, the six states drawn with the same dot component, and the rule that the shape carries the meaning and an agent saying "done" never moves a dot. `Esc` or its Close button closes it. The skipped state is a short dash with no ring, so it cannot be mistaken for the thin "not yet" ring (proposed D91); in forced-colours mode every dot shape takes the system text colour. Each dot keeps its tooltip (stage and state) on hover; the dots sit inside the row button, so they take no focus of their own and the row's accessible name lists all six.

Default view: group by attention, since 7 days, sorted by recent activity, 25 per page.

**View state.** Everything above lives in the URL query string (only what differs from the default), so a view is shareable and the back button works. The last view's query string is also kept in `localStorage` (`vantage.view`) and used when the page opens with no query. The token never enters the query string, history or `localStorage` (D75).

**Screen states for Track.**

| State | What the user sees |
|---|---|
| Loading, first load | Skeleton rows |
| Loading, a control changed | The previous rows stay, dimmed and marked busy, until the new response lands; a stale request is cancelled |
| Empty, no work at all | "No work yet. Run `vantage init` in a repo to start." |
| Empty, filters removed everything | "Nothing matches these filters." plus one line per filter that, removed on its own, would bring items back ("The repo filter hides 10 items. Remove it"), and Clear all filters. With only the default 7 days: "Nothing active in the last 7 days." with a way to widen it |
| Live push | Rows on the page update in place; rows never appear, vanish or move. Counts refresh at most once a second. Reconnect and `resync` refetch the current page |

## API (daemon to UI)

HTTP on `127.0.0.1`, token required on every `/api/*` call as `Authorization: Bearer` (D32; never in the query string). Requests need an allowed `Host` and `Origin`, only GET and HEAD are accepted in Phase 1, and no CORS headers are sent. Rules in [D75](../DECISIONS.md#d75-phase-1-track-page-and-local-server-rules-the-specs-left-open) (proposed). JSON throughout.

| Method and path | Purpose |
|---|---|
| `GET /api/focus` | Top 3 items plus digest groups |
| `GET /api/track` | Track rows: filtered, sorted, paged and grouped, with `page`, `facets`, `lastPassAt`, `stale` and per-source health. Parameters below (proposed [D84](../DECISIONS.md)). Each row's `repo` is its git repo (the remote path, or the main folder for a repo with no remote; null when the folder is in no repo) `repoUrl` its `https` link and `org` its owner (`local` with no remote), never a worktree folder (proposed [D99](../DECISIONS.md)); `group=repo` ends with a "No repo" group |
| `GET /api/items/:id` | Item detail. Phase 1 (proposed D100): repo and repo URL, branch, worktree path, last commit sha, sessions with their parent, edited files by base name. Later: behaviors, review, after-ship, links |
| `GET /api/journal?since=` | Timeline entries |
| `GET /api/inbox` | Mentions, review requests, commitments by person |
| `GET /api/sources` | Health per source |
| `POST /api/items/:id/actions` | Pin, demote, park, split, merge, unlink, approve behavior, mark manual proof |
| `POST /api/items/:id/resume` | Build the resume prompt (returns it; running needs a second confirm) |
| `POST /api/explain` | Build or return a cached explanation (`target`, `kind`, `audience`, `depth`) |
| `POST /api/explain/:id/freeze` | Confirm and freeze a why tree |
| `GET /api/pings` | Owed replies, follow-ups and close-the-loop items by person |
| `POST /api/pings/:id/draft` | Draft a message (returned, never sent) |
| `POST /api/pings/:id/actions` | Mark done, snooze |
| `GET /api/landing` | Evening landing: open loops to close, park or schedule |
| `POST /api/landing` | Apply landing choices and the mood check |
| `GET /api/rewards` | Streaks and badges |
| `GET /api/decisions?item=&project=&since=&who=&status=` | Decision log |
| `POST /api/decisions/:id/actions` | Approve or change a proposed decision |
| `GET /api/settings` | Engines, budgets and data policy with current values and availability ([settings](settings.md)) |
| `POST /api/settings` | Change engines, budgets or data policy; recorded in `user_actions` |
| `GET /api/diagnostics` | Source health, budgets with current values, recent errors |
| `GET /api/items/:id/trace` | Why this item changed: events, rules fired, resulting changes |
| `GET /api/live` (WebSocket) | Pushes `item.changed`, `flag.raised`, `source.health` events |

Phase 1 ships only `GET /api/track`, `GET /api/items/:id`, `GET /api/items/:id/trace`, `GET /api/diagnostics` and `GET /api/live`; the item id is the URL-encoded `item_key` (for example `issue%3AFTK-2`). `/api/live` (proposed D81) passes the same Host, Origin and token checks as every route before the upgrade; the token rides in the `Sec-WebSocket-Protocol` header (`vantage.v1, <token>`), never the URL. It pushes `item.changed` (id and changed fields), `flag.raised` (id, kind, severity), `source.health` and `resync` after each stage pass, with no transcript or command text, and caps at 8 connections with a 15 s ping. The page refetches `/api/track` on every connect and polls it every 5 seconds only while the socket is down, reconnecting with backoff from 1 s to 30 s.

### `GET /api/track` parameters

All optional. A list is comma-separated (`stage=asked,built`); an empty value means unset. Anything unknown, malformed, repeated or out of range is `400 {"error": "..."}` (the message names the parameter, never its value). The token stays in the `Authorization` header; there are no secrets in the query string.

| Parameter | Values | Default |
|---|---|---|
| `org` | up to 50 owners (`Flip-to`, `local`), matched case-insensitively (proposed [D99](../DECISIONS.md)) | all |
| `repo` | up to 50 repo paths (`host/Owner/repo`), matched case-insensitively | all |
| `branch` | up to 50 names, 200 characters each, matched exactly | all |
| `stage` | `asked`, `built`, `proven`, `reviewed`, `shipped`, `verified` | all |
| `proof` | `none`, `fresh`, `expired`, `failed`, `weak`, `not_required` | all |
| `flag` | `thrashing`, `unproven_claim`, `forgotten`, `none` (an item matches if it has any listed flag; `none` matches items with no open flag) | all |
| `since` | `24h`, `7d`, `30d`, `all`: last activity within the window | `7d` |
| `hasEdits` | `true`, `false`: any code edit linked (false for conversations and documentation-only items) | both |
| `q` | at most 80 characters; case-insensitive substring over title, repo and branch only (ASCII case folding) | none |
| `sort`, `order` | `activity`, `stage`, `title`, `repo`, `flags`; `asc`, `desc` | `activity` `desc` |
| `group` | `attention`, `org`, `repo`, `stage`, `none` | `attention` |
| `page`, `pageSize` | integers from 1 (`pageSize` up to 100) | `1`, `25` |

Response, on top of the Phase 1 fields (`generatedAt`, `lastPassAt`, `stale`, `sources`):

- `page`: `{page, pageSize, total, pages}`. `total` counts the whole filter; `pages` is at least 1. A page past the end returns `200` with no items.
- `groups`: `{id, label, total, items, attention?}`. `total` counts the whole filter; `items` are only this page's rows. Pagination runs over the flat sorted list and groups are derived from the page. `group=attention` always lists its five groups (`needs_you`, `in_progress`, `waiting`, `forgotten`, `done`): `needs_you` holds only items with `thrashing` or `unproven_claim`, and `forgotten` holds items whose only flag is `forgotten` (low urgency; the UI collapses it; proposed [D94](../DECISIONS.md)); `org`, `repo` and `stage` list only groups that have rows on the page (`org:<owner in lower case>`, `org:` and `repo:` for no repo, `repo:<name>`, `stage:<name>`); `none` is one group `all`.
- `facets`: `{repo, branch, stage, proof, flag, age: {today, week, older}, hasEdits: {true, false}}`: counts per value, each over the items that pass every filter except that dimension's own (the `since` filter does not apply to `age`), so the UI can show what selecting a value would give. `stage`, `proof`, `flag`, `age` and `hasEdits` list every known value, zero included. `repo` and `branch` list at most 200 values, largest first. `today` is the last 24 hours and `week` the 7 days before that.
- Each item adds `branch`, `hasEdits`, `firstActivity`, `sessionCount` (sessions feeding it, default 1) and `derivedCount` (how many continue another session, default 0; D86); each flag's `reason` is a short sentence naming files by base name only. An item with no title of its own is titled from repo, branch and first activity date (`claude-code · main · Oct 14`), never from prompt text.

Cost: filtering, sorting and paging run in SQLite over `work_items` (indexed on `last_activity`, `(repo, last_activity)` and `(stage, last_activity)`): one bounded scan for the count, one for the page and one per facet dimension, about ten scans in all. A daemon test runs a combined query (search, sort by flags, filters, a deep page, all facets) over 3,000 items against a 250 ms budget. Only the page's rows load their flags.

Rules: no state change on GET; every POST is recorded in `user_actions` (see [data schema](data-schema.md)).

## Performance budgets

- First paint of Track under 300 ms with 500 items.
- Live updates appear within 2 s of the event reaching the daemon.
- Keyboard actions respond within 100 ms.
