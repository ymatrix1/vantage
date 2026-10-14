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
| D18 | 2026-10-14 | **Personal tool first.** Built for one user; nothing should block a product later. | Keeps setup, OS support and polish minimal while the idea is proven. |
| D19 | 2026-10-14 | **Pull is the backbone, push only speeds things up.** Every source supports catch-up from a stored cursor. | Laptops sleep; nothing should be lost. |
| D20 | 2026-10-14 | **No public endpoint by default.** Webhooks only through an optional relay, later. | Local-first and company data. |
| D21 | 2026-10-14 | **Hooks only append to a local spool file** and return in under 100 ms. | Never slow down or break an agent. |
| D22 | 2026-10-14 | **GitHub Notifications API is the primary GitHub trigger.** | Already filtered to what's relevant, has read state, conditional polling is free. |
| D23 | 2026-10-14 | **Slack via Socket Mode** if a Slack app is approved; search polling otherwise. | Real time without a public URL. |
| D24 | 2026-10-14 | **Item kinds:** `own_work`, `review_request`, `commitment`, `follow_up`. | Reviews and promises need attention too, with shorter tracks. |
| D25 | 2026-10-14 | **Boundary rules:** issue key wins, then branch or worktree, then provisional per-session items; user Split and Merge always win. | Deterministic for most work; correctable for the rest. |
| D26 | 2026-10-14 | **Agent setup ported from PortPS5:** `AGENTS.md` as the canonical instructions, shared `.agents/rules` and `.agents/skills`, beans for task tracking. No Ouroboros. | One setup across projects and agents. |
| D27 | 2026-10-14 | **Calm default look inspired by Pane's Folio theme; token-based themes with user custom themes** that may change style but not meaning (contrast and distinguishability checked). | The user likes Pane's calm look and wants personalization; meaning colors carry status. |
| D28 | 2026-10-14 | **Proof is first-class:** its own spec, types, strength levels L0–L4, freshness by code fingerprint, fake proof detection. Agents can only *reference* proof Vantage captured; they can't create it from text. | Proof is the core of evidence over claims; it must be hard to fake and visible when weak. |
| D29 | 2026-10-14 | **The method is named A2V: Asked to Verified**, documented in `docs/METHOD.md` separately from the product, so it can be taught or sold on its own. Always written in full the first time. | A coined, ownable name; common phrases (evidence-driven, proof-driven, receipts) are taken. An unrelated "Agility to Value (A2V)" framework exists, so a trademark check is needed before selling. |

## Proposed (pending confirmation)

| # | Proposal | Why |
|---|---|---|
| V1 | **Comment on a diff hunk from the Item page, and Vantage turns it into a prompt for the session that owns the item** (idea from Vibe Kanban). | Fast feedback without switching terminals; keeps Vantage a viewer that hands off, not an agent runner. |
| V2 | **A Vantage MCP server** that lets agents register behaviors, reference captured proof runs, propose items and ask the user for decisions. Agents can never move a stage. | Agents can help structure work, while status stays evidence-based. |
| V3 | **Visual proof:** screenshot of the running app after the last edit as a `visual` proof type (inspired by Vibe Kanban's built-in preview). Vantage stores the screenshot; it doesn't ship its own browser. | UI work is often best proven by looking. |
