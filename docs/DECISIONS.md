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
