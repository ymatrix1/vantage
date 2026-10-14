# Spec: web UI

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
| `j` / `k` | Next / previous row |
| `Enter` | Open item |
| `Esc` | Close panel or palette |
| `/` | Search |
| `p` | Pin or unpin item |
| `z` | Park item |
| `r` | Resume with context |
| `a` | Ask for proof |
| `e` | Explain the selected item, project or week |
| `1` / `2` / `3` | Group Track by attention / project / stage |
| `?` | Show this map |

## API (daemon to UI)

HTTP on `127.0.0.1`, token required on every `/api/*` call as `Authorization: Bearer` (D32; never in the query string). Requests need an allowed `Host` and `Origin`, only GET and HEAD are accepted in Phase 1, and no CORS headers are sent. Rules in [D75](../DECISIONS.md#d75-phase-1-track-page-and-local-server-rules-the-specs-left-open) (proposed). JSON throughout.

| Method and path | Purpose |
|---|---|
| `GET /api/focus` | Top 3 items plus digest groups |
| `GET /api/track` | Track rows grouped by attention, with `lastPassAt`, `stale` and per-source health (Phase 1; `group` and `filter` parameters arrive with project and stage grouping) |
| `GET /api/items/:id` | Item detail: stage, behaviors, proofs, review, after-ship, history, links |
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

Phase 1 ships only `GET /api/track`, `GET /api/items/:id/trace` and `GET /api/diagnostics`; the item id is the URL-encoded `item_key` (for example `issue%3AFTK-2`). The page polls `/api/track` every 5 seconds until `/api/live` exists.

Rules: no state change on GET; every POST is recorded in `user_actions` (see [data schema](data-schema.md)).

## Performance budgets

- First paint of Track under 300 ms with 500 items.
- Live updates appear within 2 s of the event reaching the daemon.
- Keyboard actions respond within 100 ms.
