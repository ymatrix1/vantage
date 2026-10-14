# Decisions

| # | Date | Decision | Why |
|---|---|---|---|
| D1 | 2026-10-13 | Track **work items**, not sessions. | Existing tools (Agent View, Pane, Vibe Kanban, Conductor) already show sessions; none show the true state of work. |
| D2 | 2026-10-13 | Lifecycle **Asked → Built → Proven → Reviewed → Shipped → Verified**. | One visual spine covers lost state, unproven claims, review loop and post-ship checks. |
| D3 | 2026-10-13 | Cards move **only on evidence**; agent claims never move a card. | Fixes "trust me bro" claims at the root. |
| D4 | 2026-10-13 | **Proof expires** on any later linked edit. | Proof of old code isn't proof of new code. |
| D5 | 2026-10-13 | Review loop stays **inside Reviewed** with sub-states. | Avoids cards bouncing between columns, which adds stress. |
| D6 | 2026-10-13 | Shipped means **merged and deployed**; **Verified** needs post-deploy checks and a clean monitoring window. | Merged isn't the same as working. |
| D7 | 2026-10-13 | A regression **spawns a linked follow-up card**; the original isn't reopened. | Keeps an honest record of what shipped and avoids "done" work silently coming back. |
| D8 | 2026-10-13 | Skipped or unconfigured stages show **hollow**, never green. | Honest status. |
| D9 | 2026-10-13 | **Parked** only by explicit user choice. | Never hide work automatically. |
| D10 | 2026-10-13 | Scores computed **in code** from explicit signals; LLM or judgment models only for fuzzy yes/no questions. | Explainable, cheap, testable. |
| D11 | 2026-10-13 | **Local-first**; remote sources read-only unless the user acts. | Company data and trust. |
| D12 | 2026-10-13 | Build order: local sources → GitHub → CI/CD and monitoring → issue tracker (Jira or Linear) and Slack. | Each layer is useful alone; most reliable data first. |
| D13 | 2026-10-13 | Issue tracker is pluggable: **Jira or Linear** behind one adapter interface. | Different teams and projects use different trackers; nothing else in the model should depend on which. |
| D14 | 2026-10-14 | Pages: **Focus, Track, Item, Journal, Inbox, Sources**, plus ambient status line and toasts. | One question per page. |
| D15 | 2026-10-14 | **Track is a table of rows with an inline stage track**, not a kanban board. Board is an optional toggle; graph only inside Item. | Scales past 15 items, keeps priority visible, easy to scan. |
| D16 | 2026-10-14 | **Group by attention by default**; group by project or stage is a toggle. Projects are Jira epics, Linear projects or repo groups; contexts (Work, Personal) sit above. | Stress comes from cross-project attention; projects still matter for overview. |
| D17 | 2026-10-14 | **SQLite (WAL) for the live store; DuckDB for analysis.** | The live workload is small transactional writes; DuckDB shines at scans and can read SQLite and `.jsonl` directly. |

## Proposed (pending confirmation)

| # | Proposal | Why |
|---|---|---|
| P1 | **Pull is the backbone, push only speeds things up.** Every source supports catch-up from a stored cursor. | Laptops sleep; nothing should be lost. |
| P2 | **No public endpoint by default.** Webhooks only through an optional relay, later. | Local-first and company data. |
| P3 | **Hooks only append to a local spool file** and return in under 100 ms. | Never slow down or break an agent. |
| P4 | **GitHub Notifications API is the primary GitHub trigger.** | It's already filtered to what's relevant to the user, has read state, and conditional polling is free. |
| P5 | **Slack via Socket Mode** if a Slack app is approved; search polling otherwise. | Real-time without a public URL. |
| P6 | **Item kinds:** `own_work`, `review_request`, `commitment`, `follow_up`. | Reviews and promises need attention too, with shorter tracks. |
| P7 | **Boundary rules:** issue key wins, then branch or worktree, then provisional per-session items; user Split and Merge always win. | Deterministic for most work; correctable for the rest. |
