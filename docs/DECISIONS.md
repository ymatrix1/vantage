# Decisions

Every decision records five things:

- **Context:** the situation and problem that forced a choice.
- **Decision:** what was chosen, stated precisely.
- **Why:** the reasoning that made this option win.
- **Alternatives:** what else was considered and why it lost.
- **Impact:** what this changes or commits us to (docs, code, scope, cost, risk), and what would make us revisit it.

Proposals the user hasn't confirmed live under [Proposed](#proposed-pending-confirmation) in the same format.

## Index

| # | Date | Decision |
|---|---|---|
| [D1](#d1-track-work-items-not-sessions) | 2026-10-13 | Track work items, not sessions |
| [D2](#d2-the-six-step-track) | 2026-10-13 | The six-step track |
| [D3](#d3-cards-move-only-on-evidence) | 2026-10-13 | Cards move only on evidence |
| [D4](#d4-proof-expires) | 2026-10-13 | Proof expires |
| [D5](#d5-review-loop-stays-inside-reviewed) | 2026-10-13 | Review loop stays inside Reviewed |
| [D6](#d6-shipped-means-deployed-verified-means-checked) | 2026-10-13 | Shipped means deployed; Verified means checked |
| [D7](#d7-regressions-spawn-follow-up-cards) | 2026-10-13 | Regressions spawn follow-up cards |
| [D8](#d8-honest-dots) | 2026-10-13 | Honest dots |
| [D9](#d9-parked-only-by-the-user) | 2026-10-13 | Parked only by the user |
| [D10](#d10-scores-computed-in-code) | 2026-10-13 | Scores computed in code |
| [D11](#d11-local-first) | 2026-10-13 | Local-first |
| [D12](#d12-build-order) | 2026-10-13 | Build order |
| [D13](#d13-pluggable-issue-tracker) | 2026-10-13 | Pluggable issue tracker |
| [D14](#d14-six-pages) | 2026-10-14 | Six pages |
| [D15](#d15-track-is-rows-not-a-board) | 2026-10-14 | Track is rows, not a board |
| [D16](#d16-group-by-attention-by-default) | 2026-10-14 | Group by attention by default |
| [D17](#d17-sqlite-live-duckdb-for-analysis) | 2026-10-14 | SQLite live, DuckDB for analysis |
| [D18](#d18-personal-tool-first) | 2026-10-14 | Personal tool first |
| [D19](#d19-pull-is-the-backbone) | 2026-10-14 | Pull is the backbone |
| [D20](#d20-no-public-endpoint-by-default) | 2026-10-14 | No public endpoint by default |
| [D21](#d21-hooks-only-append-to-a-spool-file) | 2026-10-14 | Hooks only append to a spool file |
| [D22](#d22-github-notifications-as-the-main-github-trigger) | 2026-10-14 | GitHub notifications as the main GitHub trigger |
| [D23](#d23-slack-via-socket-mode) | 2026-10-14 | Slack via Socket Mode |
| [D24](#d24-four-item-kinds) | 2026-10-14 | Four item kinds |
| [D25](#d25-work-item-boundary-rules) | 2026-10-14 | Work item boundary rules |
| [D26](#d26-agent-setup-ported-from-portps5) | 2026-10-14 | Agent setup ported from PortPS5 |
| [D27](#d27-calm-default-look-and-custom-themes) | 2026-10-14 | Calm default look and custom themes |
| [D28](#d28-proof-is-first-class) | 2026-10-14 | Proof is first-class |
| [D29](#d29-the-method-is-named-a2v) | 2026-10-14 | The method is named A2V |
| [D30](#d30-decisions-record-context-why-alternatives-and-impact) | 2026-10-14 | Decisions record context, why, alternatives and impact |
| [D31](#d31-phase-1-is-a-thin-usable-slice) | 2026-10-14 | Phase 1 is a thin usable slice |
| [D32](#d32-local-server-is-locked-down) | 2026-10-14 | Local server is locked down |
| [D33](#d33-events-are-the-source-of-truth) | 2026-10-14 | Events are the source of truth |
| [D34](#d34-visual-first-with-a-dot-alphabet) | 2026-10-14 | Visual first with a dot alphabet |
| [D35](#d35-landscape-home-with-dot-characters) | 2026-10-14 | Landscape home with dot characters |
| [D36](#d36-calm-gamification-rules) | 2026-10-14 | Calm gamification rules |
| [D37](#d37-explain-through-the-connected-agent) | 2026-10-14 | Explain through the connected agent |
| [D38](#d38-track-pings-draft-never-send) | 2026-10-14 | Track pings; draft, never send |
| [D39](#d39-landscape-scene-rules-from-the-25-item-test) | 2026-10-14 | Landscape scene rules from the 25-item test |

---

### D1. Track work items, not sessions

- **Context:** The user runs many Claude Code and Codex sessions in parallel and loses track of what was asked, built and shipped. Tools like Agent View, Pane, Vibe Kanban and Conductor already show sessions.
- **Decision:** Vantage's core object is a work item (one goal, one card). Sessions are evidence attached to items.
- **Why:** The pain is "what's the true state of my work", not "which terminal is busy". One goal often spans several sessions, agents and days.
- **Alternatives:** A better session dashboard (already well served by existing tools); a chat-history browser (more text, not less).
- **Impact:** Requires a linker that attaches events to items (see D25), which becomes the hardest part of the system. Positions Vantage away from crowded session managers.

### D2. The six-step track

- **Context:** The pains (lost state, unproven claims, review loop, nothing checked after release) needed one visual model that's easy to read.
- **Decision:** Every own-work item moves along Asked → Built → Proven → Reviewed → Shipped → Verified.
- **Why:** One spine shows where each item really is and exposes each pain as a stuck or flagged step.
- **Alternatives:** Free-form statuses (no shared meaning); a five-step track ending at Shipped (hid the "merged isn't working" pain, see D6).
- **Impact:** All UI, scoring and specs use these six names. Becomes the A2V track (D29). Changing a step later means changing every doc and the stage machine.

### D3. Cards move only on evidence

- **Context:** Agents often claim "done, fixed, optimized" without running anything.
- **Decision:** A step completes only when its evidence exists (diff, captured check, review, deploy, monitoring). Agent text never moves a card.
- **Why:** Fixes the "trust me" problem at the root instead of asking the user to double-check every claim.
- **Alternatives:** Trust agent status with spot checks (keeps the burden on the user); ask the agent to self-report proof (easy to fake).
- **Impact:** Every stage needs a defined evidence source and adapter. Some items will look "behind" until checks run, which is intended.

### D4. Proof expires

- **Context:** A test that passed before a later edit says nothing about the new code.
- **Decision:** Any linked edit after the latest proof moves the card from Proven (or Reviewed) back to Built.
- **Why:** Proof of old code isn't proof of new code.
- **Alternatives:** Keep proof until the next commit (too lax); expire on any edit anywhere in the repo (too noisy).
- **Impact:** Needs code fingerprints per proof (see D28). Cards may move backward, so the UI must show it clearly rather than silently.

### D5. Review loop stays inside Reviewed

- **Context:** Reviews loop: changes requested, fixes, re-review, sometimes several rounds.
- **Decision:** The card stays in the Reviewed column through the loop, with sub-states (waiting, changes requested, fixing, re-review requested, approved).
- **Why:** Bouncing cards between Built and Reviewed on every round adds noise and stress.
- **Alternatives:** Move back to Built on "changes requested" (more literal, but churny).
- **Impact:** The stage machine has sub-states for Reviewed only. Fix edits during review still expire proof (D4), shown inside the Reviewed row.

### D6. Shipped means deployed; Verified means checked

- **Context:** Merged code can still fail in production; regressions often surface days later.
- **Decision:** Shipped needs merge plus a deploy event. Verified needs post-deploy checks and a clean monitoring window (default 2 days).
- **Why:** Merged isn't the same as working.
- **Alternatives:** End the track at merge (hides production problems).
- **Impact:** Adds CI/CD and monitoring sources to the architecture and Phase 5 to the roadmap. Repos without deploy or checks show these steps hollow (D8).

### D7. Regressions spawn follow-up cards

- **Context:** A problem found after release could either reopen the original card or create new work.
- **Decision:** A regression adds a red flag to the original card and creates a linked follow-up card in Asked.
- **Why:** Keeps an honest record of what shipped and avoids finished work silently coming back.
- **Alternatives:** Reopen the original card to Built (history in one place, but "done" stops meaning done).
- **Impact:** Work items get a `parent_id`. Effort of follow-ups rolls up to the parent in the spread bar.

### D8. Honest dots

- **Context:** Some repos have no PR step, no deploy or no checks.
- **Decision:** Skipped or unconfigured steps are drawn hollow, never green.
- **Why:** Green must always mean "evidence exists".
- **Alternatives:** Hide steps that don't apply (inconsistent rows); mark them green (dishonest).
- **Impact:** The UI needs a distinct "skipped" style in every theme (D27 guardrails).

### D9. Parked only by the user

- **Context:** Old ideas and stalled work could be auto-hidden to reduce noise.
- **Decision:** Only the user parks an item. Vantage never hides work on its own.
- **Why:** Auto-hiding is how things get forgotten, the exact pain Vantage fixes.
- **Alternatives:** Auto-archive after N days of inactivity.
- **Impact:** Stale items raise the `forgotten` flag instead; Focus and digest must keep that noise low.

### D10. Scores computed in code

- **Context:** Priority, difficulty and flags could be produced by an LLM or by explicit rules.
- **Decision:** Scores come from explicit signals computed in code. LLM or judgment models only answer fuzzy yes/no questions behind one interface.
- **Why:** Explainable ("why is this ranked here?"), cheap, testable and deterministic.
- **Alternatives:** LLM ranking of all work (opaque, costly, unstable).
- **Impact:** Each score must show its reasons in the UI. A judgment layer is optional and gated by the data policy decision.

### D11. Local-first

- **Context:** Vantage reads code, transcripts, Slack, Jira and monitoring, all company data.
- **Decision:** All data stays on the user's machine by default. Remote sources are read-only unless the user acts.
- **Why:** Company data policy and the user's trust.
- **Alternatives:** A hosted service (easier sync and webhooks, but a data and compliance problem).
- **Impact:** No cloud backend; webhooks need an optional relay (D20); multi-machine sync is out of scope.

### D12. Build order

- **Context:** Many sources; building all at once is too much.
- **Decision:** Local sources (agents, git) → GitHub → CI/CD and monitoring → issue tracker and Slack.
- **Why:** Each layer is useful alone, and the most reliable data comes first.
- **Alternatives:** Start with Jira or Slack (less reliable signals, more approvals needed).
- **Impact:** Sets the roadmap phases. Review features arrive in Phase 4, tracker and Slack in Phase 6.

### D13. Pluggable issue tracker

- **Context:** Different projects use Jira or Linear.
- **Decision:** The issue tracker sits behind one adapter interface with Jira and Linear implementations.
- **Why:** Nothing else in the model should depend on which tracker is used.
- **Alternatives:** Jira only (excludes Linear projects).
- **Impact:** Anchors use a generic `issue_key`; scoring reads priority, due date and relations through the adapter.

### D14. Six pages

- **Context:** The UI needed to stay calm and easy while covering many needs.
- **Decision:** Focus, Track, Item, Journal, Inbox, Sources, plus status line, toasts and badge.
- **Why:** One question per page keeps each screen simple.
- **Alternatives:** One big dashboard (crowded); many specialized pages (hard to navigate).
- **Impact:** Defines the UI scope for Phases 2 and 3.

### D15. Track is rows, not a board

- **Context:** Options were a Trello-like board, a graph, rows with a stage track, or a timeline.
- **Decision:** Track is a table of rows with an inline six-dot track. Board is an optional toggle; a graph appears only inside Item.
- **Why:** Rows scale past 15 items, keep priority visible and scan quickly.
- **Alternatives:** Board (noisy at scale); graph (hard to scan, unstable layout).
- **Impact:** The row and dot components are the core UI building blocks.

### D16. Group by attention by default

- **Context:** Work spans several projects and both work and personal contexts.
- **Decision:** Default grouping is by attention (needs you, in progress, waiting on others, done). Group by project or stage is a toggle. Projects are Jira epics, Linear projects or repo groups; contexts (Work, Personal) sit above.
- **Why:** Stress comes from attention jumping across projects; projects still matter for overview.
- **Alternatives:** Group by project by default (hides urgent items across projects).
- **Impact:** Adds `context` and `project` to the data model and a context switch to the UI.

### D17. SQLite live, DuckDB for analysis

- **Context:** The user asked whether DuckDB would be faster than SQLite.
- **Decision:** SQLite in WAL mode is the live store. DuckDB is used for analysis and Phase 0 measurement.
- **Why:** The live workload is small transactional writes and key lookups, where SQLite excels and allows concurrent readers. DuckDB is built for large scans and can query SQLite and `.jsonl` directly.
- **Alternatives:** DuckDB as the only store (single-writer lock, slower small writes).
- **Impact:** Two engines, each in its strength. Revisit if analytics move into the live UI at large scale.

### D18. Personal tool first

- **Context:** Earlier brainstorming discussed selling Vantage; the PRD described one user.
- **Decision:** Build for one user first, without blocking a product later.
- **Why:** Keeps setup, OS support and polish minimal while the idea is proven.
- **Alternatives:** Product from day one (more onboarding, cross-OS and licensing work up front).
- **Impact:** Windows first, minimal setup. The method is documented separately so it can be sold later (D29).

### D19. Pull is the backbone

- **Context:** The laptop sleeps, restarts and goes offline; push channels miss events while it's off.
- **Decision:** Every source supports catch-up from a stored cursor. Push channels only make updates arrive faster.
- **Why:** Nothing should be lost.
- **Alternatives:** Push-only (loses events while offline).
- **Impact:** Every adapter implements `catchUp(cursor)`; polling budgets per source (see ingestion spec).

### D20. No public endpoint by default

- **Context:** Webhooks need an internet-reachable URL.
- **Decision:** Nothing listens on the internet by default. Webhooks only through an optional relay, later.
- **Why:** Local-first (D11) and company data.
- **Alternatives:** A hosted relay from the start (faster updates, but company data passes through a service).
- **Impact:** Slightly slower updates for GitHub, Jira, Linear and monitoring. Relay needs company approval (Q13).

### D21. Hooks only append to a spool file

- **Context:** Claude Code and git hooks run inside the user's workflow on every action.
- **Decision:** Hooks append one line to a local spool file and return in under 100 ms. The daemon reads the spool.
- **Why:** Never slow down or break an agent, even when the daemon is down.
- **Alternatives:** Hooks write to the database or call the daemon directly (slower, fails when the daemon is down).
- **Impact:** A spool reader in the daemon; a performance test for hooks.

### D22. GitHub notifications as the main GitHub trigger

- **Context:** GitHub events could come from webhooks, broad API polling or the Notifications API.
- **Decision:** Poll the Notifications API with conditional requests; fetch thread details on demand.
- **Why:** It's already filtered to what involves the user, carries read state, and unchanged polls don't count against rate limits.
- **Alternatives:** Webhooks (need a public endpoint); polling every repo (wasteful).
- **Impact:** Coverage must be verified (research R4). Gives "seen" state for free.

### D23. Slack via Socket Mode

- **Context:** Slack mentions and commitments need near real-time detection without a public URL.
- **Decision:** Use a Slack app with Socket Mode and user-scoped events if approved; otherwise poll search.
- **Why:** Real time with no public endpoint.
- **Alternatives:** Events API webhooks (need a public URL); search polling only (slower, rate-limited).
- **Impact:** Needs workspace admin approval (decision bean). Fallback keeps Slack working without it.

### D24. Four item kinds

- **Context:** Not everything needing attention is the user's own code: review requests and promises matter too.
- **Decision:** Item kinds `own_work`, `review_request`, `commitment`, `follow_up`, with shorter tracks for review requests and commitments.
- **Why:** Reviews and promises are a big source of stress and get forgotten.
- **Alternatives:** Only own work (misses a large part of the pain).
- **Impact:** UI shows short tracks; scoring treats "someone is blocked on you" as a top priority signal.

### D25. Work item boundary rules

- **Context:** One session can touch two tickets; one ticket can span many sessions.
- **Decision:** Issue key wins, then branch or worktree, then provisional per-session items. User Split and Merge always win.
- **Why:** Deterministic for most work (agents mostly run in worktrees), correctable for the rest.
- **Alternatives:** LLM-only grouping (costly, error-prone); one item per session (fragments work).
- **Impact:** The linker is anchor-first. Rules will be validated against real data in research R1.

### D26. Agent setup ported from PortPS5

- **Context:** The user already has a working agent setup in another repo.
- **Decision:** `AGENTS.md` as canonical instructions, shared `.agents/rules` and `.agents/skills`, beans for task tracking, `beans prime` hooks. No Ouroboros.
- **Why:** One familiar setup across projects and agents.
- **Alternatives:** A Vantage-only setup; keeping Ouroboros (the user removed it).
- **Impact:** All task work goes through beans with the structured template; skills are shared across agents.

### D27. Calm default look and custom themes

- **Context:** The user likes Pane's calm Folio theme and wants personalization.
- **Decision:** A calm default inspired by Folio, with token-based themes and user custom themes that may change style but not meaning (contrast and distinguishability checked).
- **Why:** Calm is a product goal; status colors carry meaning that must survive any theme.
- **Alternatives:** One fixed theme (no personalization); free-form CSS themes (can break meaning).
- **Impact:** All UI colors come from tokens; a theme loader with checks; research R11 for the palette. Pane is AGPL, so inspiration only.

### D28. Proof is first-class

- **Context:** Proof rules were spread across several docs; proof is the heart of evidence over claims.
- **Decision:** Proof gets its own spec: types, levels L0–L4, freshness by code fingerprint, fake proof detection. Agents can only reference proof Vantage captured.
- **Why:** Proof must be hard to fake and visible when weak.
- **Alternatives:** A single "tests passed" flag (hides weak proof, easy to fake).
- **Impact:** A proof record and fingerprinting in the data model, a Proof section on the Item page, and new Track filters.

### D29. The method is named A2V

- **Context:** The user wants a name for the method that could be sold later.
- **Decision:** **A2V: Asked to Verified**, documented in `docs/METHOD.md` separately from the product, always written in full the first time.
- **Why:** Short, names the track itself, works as a badge. Common phrases (evidence-driven, proof-driven, receipts) are already taken.
- **Alternatives:** Proofwork, Evident.
- **Impact:** Docs refer to "the A2V track". An unrelated "Agility to Value (A2V)" framework exists, so a trademark and domain check is required before selling (bean `vantage-uye1`).

### D30. Decisions record context, why, alternatives and impact

- **Context:** The decision log was a one-line table that lost the reasoning behind each choice.
- **Decision:** Every decision and proposal records Context, Decision, Why, Alternatives and Impact.
- **Why:** Future readers (the user, agents, buyers of the method) need to know why, what else was considered, and what each choice commits us to.
- **Alternatives:** A short table (fast, but loses context).
- **Impact:** Longer log; rules and the `update-spec` skill enforce the format.


### D31. Phase 1 is a thin usable slice

- **Context:** Only Phase 0 was broken into tasks; Phase 1 mixed infrastructure with UI and had no clear minimum.
- **Decision:** Phase 1 covers only Claude Code and git, only Asked, Built and Proven, the warn-mode gate, the status line and a minimal Track page.
- **Why:** Get to daily use fast; the kill rule (PRD) needs a usable version to judge.
- **Alternatives:** Build infrastructure first and UI later (no feedback for weeks).
- **Impact:** GitHub, reviews, ship stages, Focus and trackers move to later phases. Phase 1 beans come from this list.

### D32. Local server is locked down

- **Context:** A localhost web UI with work data can be reached by other local programs and, through the browser, by malicious sites.
- **Decision:** Bind to 127.0.0.1, require a per-install token, check Origin and Host, no CORS, no state changes on GET, user-only file permissions.
- **Why:** Vantage holds company data; a local page is not automatically private.
- **Alternatives:** No auth because it's localhost (open to DNS rebinding and cross-site requests).
- **Impact:** Token handling in the UI launch flow and in every request; tests for rejected origins.

### D33. Events are the source of truth

- **Context:** Bugs in the linker or scorers could corrupt derived state.
- **Decision:** Events and user actions are immutable; every other table can be rebuilt by replaying them. Merges link through PR numbers and branches, not commit ids.
- **Why:** Safe recovery and testable logic; squash merges and rebases change commit ids.
- **Alternatives:** Mutable state only (no recovery); commit-id linking (breaks on squash).
- **Impact:** Replay command and fixtures; schema in `docs/specs/data-schema.md`.

### D34. Visual first with a dot alphabet

- **Context:** The user wants to read less: colors, drawings and visuals instead of text. A first attempt removed titles and used emoji, which made items unidentifiable and rendered inconsistently.
- **Decision:** Shape, color, size and position carry state; 2–4 word titles carry identity; about 30 words per screen. Six dot states differ by shape first, then color. Proof level shows as 1 to 4 green arcs around the Proven dot (count, not shine, which blurred at small sizes). Flags use one line-icon set, never emoji.
- **Why:** Glanceable without losing identity; works for colorblind users and any theme; ties the reward (more arcs) to the A2V method.
- **Alternatives:** No text at all (items can't be told apart); text-heavy cards (the original pain).
- **Impact:** A shared component set used by every page and the status line; [visual language spec](specs/visual-language.md).

### D35. Landscape home with dot characters

- **Context:** A visual list was still a list, and the product name (a view from a high point) was unused. OpenAI's dots showed characters as the things themselves.
- **Decision:** Each work item is a dot character (body = project, ring = A2V track, face = attention, badge = reason). Focus is a landscape: needs-you in the foreground, moving in the middle, waiting on the horizon, verified as stars, parked on a shelf. Track rows remain the fallback.
- **Why:** Spatial memory and depth show urgency at a glance; the metaphor matches the name; it makes progress feel tangible.
- **Alternatives:** Styled list (still a list); free-floating graph (unstable, hard to scan).
- **Impact:** Caps per band, stable placement, scene palettes per time of day and theme. Must pass a scale test (Q20) before Phase 3.

### D36. Calm gamification rules

- **Context:** The user wants a more gamified, less stressful app.
- **Decision:** Reward good practice, never volume or speed: proof arcs, stars for verified work, gentle streaks that pause instead of breaking, rare badges for A2V practices, an evening landing that closes open loops. No leaderboards, points for commits or lines, breaking streaks or random rewards. Quiet mode turns it off.
- **Why:** Visible small wins and closure lower stress; loss mechanics and comparison raise it.
- **Alternatives:** Classic points and leaderboards (stressful, rewards the wrong thing).
- **Impact:** Moments (verified, regression, landing, morning) become UI features in Phase 3.

### D37. Explain through the connected agent

- **Context:** People with little time need status explained top-down, McKinsey-style (answer first, SCR, MECE), with the option to drill into detail.
- **Decision:** An Explain quick action runs the user's connected agent headless (for example `claude -p`) on Vantage's structured facts. The model returns typed blocks (headline, SCR, tree, missing, diagram, example, follow-ups) that Vantage renders. Every claim cites evidence or is dropped. Issue trees start collapsed and expand on click; MECE is checked silently by Vantage. Two trees: *why we built it* (frozen intent) and *where it stands* (live).
- **Why:** Uses tools the user already pays for; keeps the model from deciding status; progressive disclosure serves both the 30-second reader and the deep dive.
- **Alternatives:** Free-form LLM summaries (unverifiable, can invent status); a separate API key and model (more cost and setup).
- **Impact:** A JSON schema, renderer components and caching; gated by the data policy decision; [Explain spec](specs/explain.md).

### D38. Track pings; draft, never send

- **Context:** Work stalls on people: questions seen but not answered, reviews nobody picked up, finished work nobody was told about. `unseen_mention` cleared once a message was seen, even without a reply.
- **Decision:** Three flags: `owe_reply`, `follow_up_due`, `close_the_loop`, with working-hour thresholds. One click drafts the message in the right place; the user always sends it. Flags clear only when Vantage sees the user's message in the source.
- **Why:** Owed replies and silent waits are a large, invisible source of stress and delay; drafting removes friction while keeping the user in control of what's said.
- **Alternatives:** Only track unseen mentions (misses seen-but-unanswered); auto-send nudges (risky, impersonal, could embarrass the user).
- **Impact:** Question detection rules plus an optional judge (data policy), thresholds per case, Inbox sections and landscape badges; [pings spec](specs/pings.md).

### D39. Landscape scene rules from the 25-item test

- **Context:** D35 required the landscape to pass a scale test (Q20). A render with 25 items showed green grass hiding the green done arcs, rings merging with the dot body, badges covering arcs, and cryptic corner labels.
- **Decision:** Neutral ground (no meaning colors in scenery); a clear gap between body and ring; white arcs for remaining steps; badges just outside the ring; "+N" overflow labels; moon and shelf icons with counts in the corners. Band caps (3 foreground, 8 middle) confirmed.
- **Why:** With these fixes the 25-item view stays readable at a glance and green keeps one meaning.
- **Alternatives:** Green landscape (breaks the color meaning); no ring for remaining steps (loses "out of six"); gray dots for remaining steps (worked, but the white ring with spacing reads more naturally).
- **Impact:** Closes Q20. Scene palettes for dusk, night and dark mode still to design in the UI phase.
---

## Proposed (pending confirmation)

### V1. Diff comments become prompts

- **Context:** Giving feedback on agent work means switching to the right terminal and explaining where. Vibe Kanban lets users comment on a diff and sends it to the agent.
- **Decision:** From the Item page, the user comments on a diff hunk and Vantage turns it into a prompt for the session that owns the item.
- **Why:** Fast feedback without switching terminals; Vantage stays a viewer that hands off, not an agent runner.
- **Alternatives:** No feedback path from Vantage (user copies context by hand).
- **Impact:** Needs a way to reach or resume the owning session; waits on research R12.

### V2. A Vantage MCP server

- **Context:** Agents could help structure work (behaviors, proof references, decisions) if they had a channel to Vantage.
- **Decision:** An MCP server where agents register behaviors, reference captured proof runs, propose items and ask the user for decisions. Agents can never move a stage.
- **Why:** Agents help with structure while status stays evidence-based (D3, D28).
- **Alternatives:** No agent channel; or let agents update status (breaks D3).
- **Impact:** New interface to secure and test; waits on research R12.

### V3. Visual proof by screenshot

- **Context:** UI changes are often best proven by looking. Vibe Kanban has a built-in preview browser.
- **Decision:** A `visual` proof type: a screenshot of the running app after the last edit, stored by Vantage. No browser inside Vantage.
- **Why:** Gives UI work real evidence without building a browser.
- **Alternatives:** A built-in preview browser (large scope); no visual proof.
- **Impact:** Screenshot capture method to choose; storage in `~/.vantage/`; waits on research R12.
