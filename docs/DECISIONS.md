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
| [D40](#d40-measure-felt-load-not-just-usage) | 2026-10-14 | Measure felt load, not just usage |
| [D41](#d41-status-line-uses-text-glyphs) | 2026-10-14 | Status line uses text glyphs |
| [D42](#d42-a-decision-log-for-every-ai-and-person-decision) | 2026-10-14 | A decision log for every AI and person decision |
| [D43](#d43-guard-the-scope) | 2026-10-14 | Guard the scope |
| [D44](#d44-a-daemon-plus-one-claude-code-plugin) | 2026-10-14 | A daemon plus one Claude Code plugin |
| [D45](#d45-local-only-telemetry) | 2026-10-14 | Local-only telemetry |
| [D46](#d46-explain-runs-in-layers-headless-is-opt-in) | 2026-10-14 | Explain runs in layers; headless is opt-in |
| [D47](#d47-diff-comments-become-prompts) | 2026-10-14 | Diff comments become prompts |
| [D48](#d48-a-vantage-mcp-server) | 2026-10-14 | A Vantage MCP server |
| [D49](#d49-visual-proof-by-screenshot) | 2026-10-14 | Visual proof by screenshot |
| [D50](#d50-one-command-to-add-an-existing-repo) | 2026-10-14 | One command to add an existing repo |
| [D51](#d51-logo-and-wordmark) | 2026-10-14 | Logo and wordmark |
| [D52](#d52-install-with-a-prompt) | 2026-10-14 | Install with a prompt |
| [D53](#d53-the-proof-gate-skips-docs-only-sessions) | 2026-10-14 | The proof gate skips docs-only sessions |
| [D54](#d54-events-take-the-branch-at-event-time) | 2026-10-14 | Events take the branch at event time |
| [D55](#d55-thrashing-counts-only-failures-not-cleared-by-a-passing-check) | 2026-10-14 | Thrashing counts only failures not cleared by a passing check |
| [D56](#d56-github-notifications-are-a-wake-up-signal-state-comes-from-graphql) | 2026-10-14 | GitHub notifications are a wake-up signal; state comes from GraphQL |
| [D57](#d57-vantage-owns-status-and-tree-shape-the-model-writes-text-only) | 2026-10-14 | Vantage owns status and tree shape; the model writes text only |
| [D58](#d58-headless-explain-runs-as-an-isolated-background-job) | 2026-10-14 | Headless Explain runs as an isolated background job |
| [D59](#d59-claude-code-spool-hooks-run-async) | 2026-10-14 | Claude Code spool hooks run async |
| [D60](#d60-stop-gate-output-contract) | 2026-10-14 | Stop gate output contract |
| [D61](#d61-claude-code-opentelemetry-as-an-optional-local-source) | 2026-10-14 | Claude Code OpenTelemetry as an optional local source |
| [D62](#d62-svelte-for-the-web-ui) | 2026-10-14 | Svelte for the web UI |
| [D63](#d63-npm-package-for-install) | 2026-10-14 | npm package for install |
| [D64](#d64-oxc-tools-for-lint-and-format) | 2026-10-14 | Oxc tools for lint and format |
| [D65](#d65-shadcn-svelte-for-ui-components) | 2026-10-14 | shadcn-svelte for UI components |
| [D66](#d66-pnpm-workspaces-on-node) | 2026-10-14 | pnpm workspaces on Node |
| [D67](#d67-one-settings-view-for-engines-budgets-and-data-policy) | 2026-10-14 | One Settings view for engines, budgets and data policy |

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
- **Impact:** Caps per band, stable placement, scene palettes per time of day and theme. Must pass a scale test (Q20) before Phase 3a.

### D36. Calm gamification rules

- **Context:** The user wants a more gamified, less stressful app.
- **Decision:** Reward good practice, never volume or speed: proof arcs, stars for verified work, gentle streaks that pause instead of breaking, rare badges for A2V practices, an evening landing that closes open loops. No leaderboards, points for commits or lines, breaking streaks or random rewards. Quiet mode turns it off.
- **Why:** Visible small wins and closure lower stress; loss mechanics and comparison raise it.
- **Alternatives:** Classic points and leaderboards (stressful, rewards the wrong thing).
- **Impact:** Moments (verified, regression, landing, morning) become UI features in Phase 3c.

### D37. Explain through the connected agent

- **Context:** People with little time need status explained top-down, McKinsey-style (answer first, SCR, MECE), with the option to drill into detail.
- **Decision:** An Explain quick action runs the user's connected agent headless (for example `claude -p`) on Vantage's structured facts. The model returns typed blocks (headline, SCR, tree, missing, diagram, example, follow-ups) that Vantage renders. Every claim cites evidence or is dropped. Issue trees start collapsed and expand on click; MECE is checked silently by Vantage. Two trees: *why we built it* (frozen intent) and *where it stands* (live). The engine part is refined by D46.
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

### D40. Measure felt load, not just usage

- **Context:** The product's promise is less stress, but the success metrics only measured usage and speed.
- **Decision:** The evening landing ends with an optional one-tap check: "How heavy does work feel? 1–5." Stored locally; the PRD tracks its trend over the first month.
- **Why:** Daily use proves habit, not relief. The core promise needs its own measure.
- **Alternatives:** Usage metrics only (can't tell relief from compulsion); long surveys (nobody fills them in).
- **Impact:** A `mood_checks` table, one step in the landing, a PRD metric.

### D41. Status line uses text glyphs

- **Context:** The terminal status line is always visible but can't draw the SVG dot alphabet; some terminals have no color.
- **Decision:** Map dot states to Unicode shapes (● ◉ ◐ ◍ ◌ ○), with color optional and proof level as a superscript digit. Layout drops segments from the right to fit.
- **Why:** Keeps the shape-first rule (D34) in the terminal, with no emoji and no dependency on color.
- **Alternatives:** Words only (more reading); emoji (inconsistent across terminals).
- **Impact:** [Status line spec](specs/status-line.md); glyph rendering tests.

### D42. A decision log for every AI and person decision

- **Context:** Decisions were scattered: the `ai_decided` detector covered business rules in diffs, `user_actions` logged raw actions, and choices made in agent chats, PR reviews or Slack were invisible.
- **Decision:** A readable, append-only decision log per item, project and week. Each record has Context, Decision, Why, Alternatives, Impact, who (AI or person) and status. AI decisions start as proposed and need a person's approval or change. Unstated fields are marked "not stated", never invented.
- **Why:** Silent AI decisions are a core pain; people's decisions get lost across tools. One log answers "who decided this and why?" and makes AI choices reviewable.
- **Alternatives:** Only the diff-based detector (misses chat decisions); a free-text notes field (unstructured, unsearchable).
- **Impact:** A `decisions` table, transcript and message detectors, Item page section, landscape badge, API routes; [decision log spec](specs/decision-log.md). Uses the same five fields as D30.

### D43. Guard the scope

- **Context:** Planning added many features (pings, Explain, decision log, gamification, landscape) without measuring anything yet. Phase 0 grew from 2 days to 14 research beans; Phase 3 held everything visual with no cut line.
- **Decision:** Phase 0 is timeboxed to one week with four must-have beans (R1, R2, R4, R13); the rest wait for the phase that needs them. Phase 3 splits into 3a (landscape), 3b (understanding) and 3c (calm), each with its own exit criterion. The PRD lists what's deliberately not in v1. Flags live in one registry.
- **Why:** The kill rule only works if there's an early, small version to judge. Most open questions need real data, not more design.
- **Alternatives:** Keep planning until every question is answered (delays learning); build everything in one Phase 3 (no early stop point).
- **Impact:** Roadmap and PRD updated; [flag registry](specs/flags.md) replaces the flag tables in other specs. Next step is Phase 0, not more planning.

### D44. A daemon plus one Claude Code plugin

- **Context:** The user asked whether Vantage should be built as MCP, skills, or something else.
- **Decision:** The core is a local daemon with a web UI. Claude Code integration ships as one plugin: hooks for capture and the proof gate, a status line, skills that teach the A2V method, and MCP config for agents to cooperate. Explain runs in layers, with headless `claude -p` only as an opt-in fallback (D46).
- **Why:** Skills and MCP are passive; they act only when an agent chooses to, and agents forget. Hooks and a daemon are deterministic, which is what evidence over claims needs.
- **Alternatives:** Skills only (advisory, easy to ignore); an MCP server only (no always-on capture); a desktop app with no Claude Code integration (misses live events).
- **Impact:** Two deliverables to install (plugin and daemon) via `vantage init`; the MCP server (D48) arrives in Phase 3b.

### D45. Local-only telemetry

- **Context:** An always-on daemon needs debugging; the resource budget said "no telemetry".
- **Decision:** Structured logs, metrics and per-event traces are kept locally with retention limits. Nothing is sent anywhere. A scrubbed debug bundle is created only on the user's command. Every card can show "why did this change?" from its trace.
- **Why:** Debugging and trust both need to see what happened; sending data out would break local-first (D11).
- **Alternatives:** No telemetry (blind debugging); remote telemetry (company data leaves the machine).
- **Impact:** Logs, metrics and trace storage; Diagnostics tab; `vantage doctor` and `vantage debug-bundle`; an optional local OTLP receiver for Claude Code's own telemetry (R2).

### D46. Explain runs in layers; headless is opt-in

- **Context:** D37 had Explain call the agent headless (`claude -p`) on every use. The user asked whether hooks and existing sessions could avoid that, and headless use may be billed separately in future.
- **Decision:** Four layers: (1) evidence-only Explain built from Vantage data, on by default; (2) byproduct capture, where agents record decisions and summaries through a skill and MCP during normal work; (3) in-session Explain through a slash command; (4) headless `claude -p` or `codex exec` only as an opt-in fallback, with official CLIs only, a user-chosen order, a daily budget and caching.
- **Why:** Most daily needs (status, what's missing, what needs you) come straight from evidence; narrative can come from sessions already running. No separate AI calls by default protects the user's limits and avoids billing risk.
- **Alternatives:** Headless on every Explain (D37 as written; costs and limits); no AI at all (loses diagrams, examples and the why tree draft).
- **Impact:** Explain spec rewritten around layers; the web UI shows layer 1 instantly and hands off to a session; R2 checks prompt-type hooks, R13 checks the in-session flow and vendor policy.
### D47. Diff comments become prompts

- **Status:** accepted 2026-10-14 (was proposal V1); details confirmed by research R12.

- **Context:** Giving feedback on agent work means switching to the right terminal and explaining where. Vibe Kanban lets users comment on a diff and sends it to the agent.
- **Decision:** From the Item page, the user comments on a diff hunk and Vantage turns it into a prompt for the session that owns the item.
- **Why:** Fast feedback without switching terminals; Vantage stays a viewer that hands off, not an agent runner.
- **Alternatives:** No feedback path from Vantage (user copies context by hand).
- **Impact:** Needs a way to reach or resume the owning session; waits on research R12.

### D48. A Vantage MCP server

- **Status:** accepted 2026-10-14 (was proposal V2); details confirmed by research R12.

- **Context:** Agents could help structure work (behaviors, proof references, decisions) if they had a channel to Vantage.
- **Decision:** An MCP server where agents register behaviors, reference captured proof runs, propose items and ask the user for decisions. Agents can never move a stage.
- **Why:** Agents help with structure while status stays evidence-based (D3, D28).
- **Alternatives:** No agent channel; or let agents update status (breaks D3).
- **Impact:** New interface to secure and test; waits on research R12.

### D49. Visual proof by screenshot

- **Status:** accepted 2026-10-14 (was proposal V3); details confirmed by research R12.

- **Context:** UI changes are often best proven by looking. Vibe Kanban has a built-in preview browser.
- **Decision:** A `visual` proof type: a screenshot of the running app after the last edit, stored by Vantage. No browser inside Vantage.
- **Why:** Gives UI work real evidence without building a browser.
- **Alternatives:** A built-in preview browser (large scope); no visual proof.
- **Impact:** Screenshot capture method to choose; storage in `~/.vantage/`; waits on research R12.


### D50. One command to add an existing repo

- **Context:** Most repos already exist with their own hooks and history; setup must be easy and safe there.
- **Decision:** `npx vantage add` (or `/vantage add` inside Claude Code) registers the repo, installs hooks once per machine (user-level Claude Code hooks, global git hooks that chain the repo's own), backfills 14 days of this repo's sessions and git history, and opens the landscape. Nothing in the repo changes unless the user opts in with `--team`.
- **Why:** One command removes friction; machine-level hooks avoid touching every repo; chaining keeps existing hook managers working.
- **Alternatives:** Per-repo hook files (pollutes repos, conflicts with Husky and Lefthook); manual setup (too much friction).
- **Impact:** An `add` command, hook chaining logic with tests for Husky and Lefthook, a `--dry-run` mode and an optional team config file.

### D51. Logo and wordmark

- **Context:** The project needed a logo that is modern but calm and fits the vantage-point idea.
- **Decision:** A rounded-square icon of rolling hills at dusk under a warm sun, and a wordmark reading "Vantage" (capital V) in Bree Serif converted to outlines, with its cap height centered on the icon. Separate wordmark files for light and dark backgrounds.
- **Why:** The scene tells the product story (a calm view over your work) and reads at 16 px; Bree Serif is warm and calm, matching the goal of reducing stress.
- **Alternatives:** A dot character, a V monogram, layered V bands, an earthy palette (the user preferred the dusk colors), and the fonts Inter, Geist, Manrope, Outfit, Plus Jakarta Sans, Sora, Quantico, Chakra Petch, Zen Dots and Odibee Sans.
- **Impact:** `assets/` holds the icon and two wordmarks; a Brand section in the visual-language spec.

### D52. Install with a prompt

- **Context:** The end goal is that installing Vantage takes one prompt to the agent the user already uses.
- **Decision:** Publish an agent-readable install guide (`docs/install-for-agents.md`) and a copy-paste prompt in the README. The agent checks prerequisites, shows a dry run, waits for the user's OK, installs, runs `vantage doctor` and reports what changed and how to undo it. It never adds credentials or commits.
- **Why:** Users already work through agents; a prompt is easier than reading setup docs, and the dry-run and OK steps keep machine-level changes under the user's control.
- **Alternatives:** Command-line install only (more friction); an agent installing silently (changes settings without consent).
- **Impact:** The install guide must stay in sync with the `add` command; Phase 1 tests it end to end in Claude Code and Codex.

### D53. The proof gate skips docs-only sessions

- **Status:** accepted 2026-10-14 (was proposal P1).

- **Context:** R1 ([baseline](research/baseline.md#unproven-edits-p2-q3)) found 16 edit sessions in 90 days whose edits were only documentation; 50% of them ended with no qualifying check, because no test or data check applies to prose.
- **Decision:** The `Stop` gate and `unproven_claim` ignore a session whose linked edits are all documentation files (`.md`, `.mdx`, `.txt`, `.rst`). Docs checks such as a link checker may still record proof when they run.
- **Why:** Warning where no qualifying check exists teaches the user to ignore the gate.
- **Alternatives:** Treat docs like code (noisy warnings); exempt by folder such as `docs/` (misses READMEs and misfires on generated code under docs).
- **Impact:** Small change to the gate in the [proof spec](specs/proof.md#the-gate). Revisit if docs gain executable checks (doctests, notebooks).

### D54. Events take the branch at event time

- **Status:** accepted 2026-10-14 (was proposal P2).

- **Context:** R1 ([baseline](research/baseline.md#mapping-to-an-anchor-q1-d25)) found 130 of 255 edit sessions saw more than one non-default branch. Sessions start in a worktree on one branch and create or switch to another.
- **Decision:** Under D25 rule 2, each event is linked by the branch recorded on that event, not by the session's first branch. A session that changes branch splits into the items of each branch; rule 6 still re-anchors renames.
- **Why:** Session-level branch assignment would merge unrelated work or attach work to a scratch branch.
- **Alternatives:** Use the session's last branch (wrong for early events); use the first branch (wrong for most switches); ask the user (too many prompts).
- **Impact:** The linker needs a per-event branch field (Claude Code lines carry `gitBranch`). Updates the [work item model](specs/work-item-model.md#boundary-rules). Revisit if switches turn out to be mostly renames.

### D55. Thrashing counts only failures not cleared by a passing check

- **Status:** accepted 2026-10-14 (was proposal P3).

- **Context:** R1 ([baseline](research/baseline.md#thrash-loops-p5)) found 0 sessions with 3+ cycles when any successful command resets the count, and 5 (2.0% of edit sessions) when only a passing qualifying check resets it.
- **Decision:** The `thrashing` flag keeps its threshold of 3 consecutive cycles on the same file. A cycle is edits to the file, then the commands until the next edit, with at least one failing command. Only a passing qualifying check (per the proof spec) resets the count.
- **Why:** Agents run harmless successful commands (`ls`, `git status`) between failures; letting those reset hides every loop.
- **Alternatives:** Reset on any success (never fires); a lower threshold of 2 (would flag 33 sessions in 90 days, mostly normal fix-and-retry).
- **Impact:** Sharpens the definition in [flags](specs/flags.md) and [behaviors and detectors](specs/behaviors-and-detectors.md). Revisit with labeled precision once hooks capture real exit codes.

### D56. GitHub notifications are a wake-up signal; state comes from GraphQL

- **Status:** accepted 2026-10-14 (was proposal P4).

- **Context:** D22 made the Notifications API the main GitHub trigger. R4 ([research](research/github.md)) found that every comment or review on the owner's PRs bumps the PR's thread (784 of 784 PRs), but the payload can't say what happened: one thread per PR, a sticky `reason` that later notifications overwrite, no review state, and no CI notifications (0 of 909 threads, despite recent Actions runs). 4 of 27 direct review requests had no thread.
- **Decision:** Keep D22 for *waking* the adapter. For every bumped PR thread, fetch a GraphQL snapshot (reviews, review threads, commits, timeline, `statusCheckRollup`) and derive events and Reviewed sub-states by diffing it against the stored snapshot. Never read an event from `reason`. Add slow reconcile polls: `review-requested:@me` every 5–10 min, CI rollup for open PRs (on bump, then 2–5 min while pending), authored-PR catch-up on start and hourly. Treat `X-GitHub-SSO` as a health warning.
- **Why:** It keeps the cheap, free-when-idle trigger (304s) and removes the dependence on a field that can't carry the meaning we need. The reconcile polls cover the measured gaps.
- **Alternatives:** Notifications only (misses CI, hides review state, drops Done threads); polling every PR on a timer (wasteful, more rate-limit risk); webhooks (public endpoint, company approval, out of scope for v1).
- **Impact:** The GitHub adapter does a snapshot diff and stores per-PR snapshots; [ingestion](specs/ingestion.md#github-adapter-rules-from-r4), [lifecycle](specs/lifecycle.md#reviewed-sub-states) and [pings](specs/pings.md) are updated to match. Requires a classic token. Revisit if event-to-bump delay measured in Phase 1 is too long, or if a webhook relay (Q13) is approved.

### D57. Vantage owns status and tree shape; the model writes text only

- **Status:** accepted 2026-10-14 (was proposal P5).

- **Context:** Research R13 ran `claude -p --json-schema` 20 times on one synthetic item. The output was always schema-valid, but the model chose three different headline statuses for identical facts and built trees with 2 to 5 branches, never by A2V step. See [Explain engine research](research/explain-engine.md).
- **Decision:** For layers 2–4, Vantage builds the status tree, the headline status and the `missing` list from evidence (layer 1) and sends them with node ids. The model returns only text keyed by those ids (headline text, SCR, node labels, follow-ups) plus the why tree, diagrams and examples. The output schema puts the input's evidence ids in an `enum`, and the flag and gate names in an `enum` for `missing`.
- **Why:** Enforces the spec's rule that the model never decides status, makes output stable between runs, and stops non-evidence ids at the schema.
- **Alternatives:** Keep model-built trees and check MECE afterwards (unstable, needs regroup retries); free-text evidence ids filtered after the fact (works, but wastes tokens on dropped claims).
- **Impact:** Explain spec block table and schema; the MECE regroup retry only applies to why trees and project or week groupings. Revisit if a re-test shows labels-only output loses useful narrative.

### D58. Headless Explain runs as an isolated background job

- **Status:** accepted 2026-10-14 (was proposal P6).

- **Context:** R13 measured a 52.5 s median and 76.2 s p95 for `claude -p` with Haiku. The CLI accepted an invalid schema silently, and `--bare` can't use a subscription login.
- **Decision:** Layer 4 runs as a background job with a 120 s timeout. It uses `claude -p --model haiku --output-format json --json-schema`, with `--tools ""`, `--strict-mcp-config`, `--setting-sources ""`, `--no-session-persistence` and an empty working folder; never `--bare`. Vantage validates its own schema at build time and every output itself. Any nonzero exit, `is_error: true`, timeout or failed validation is a failure: retry once only on validation failure, then follow the user's agent order, then layer 1.
- **Why:** Waiting about a minute on a click is too slow. Isolation keeps the user's settings, hooks and MCP servers out of the run and sends only the facts. Vantage-side validation covers the silent schema case.
- **Alternatives:** Synchronous click-and-wait (slow); `--bare` with an API key (separate billing, setup); trusting the CLI's schema check (it didn't catch an invalid schema).
- **Impact:** Explain spec engine and failure-mode sections; a job queue and a "ready" notification in the web UI. Revisit if latency drops below about 10 s.

From research [R2](research/claude-code-hooks.md), 2026-10-14.

### D59. Claude Code spool hooks run async

- **Status:** accepted 2026-10-14 (was proposal P7).

- **Context:** Hooks must finish in under 100 ms (D21). On the user's Windows laptop a Node append hook takes 97 ms median and 115 ms max before any real work, and the user's existing hooks already add seconds to `SessionStart`.
- **Decision:** Register every Vantage spool hook (`SessionStart`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `Notification`, `PreCompact`, `SessionEnd`) as a command hook with `"async": true`. Only the `Stop` gate runs synchronously.
- **Why:** Claude Code runs async hooks in the background, so the session never waits on Vantage, whatever the runtime costs. The spool append doesn't need to return anything.
- **Alternatives:** A native binary hook (faster but a second build target); a persistent helper process (more moving parts); synchronous Node hooks (no headroom on Windows).
- **Impact:** Ingestion and operations specs; the hook latency test measures the sync `Stop` hook only. Revisit if async hooks drop events or reorder them in a way the spool can't fix (Q28).

### D60. Stop gate output contract

- **Status:** accepted 2026-10-14 (was proposal P8).

- **Context:** The proof gate spec said "warn adds a message" and "block returns exit 2" without saying how Claude Code reads each. R2 found exit 1 is a hook error, `additionalContext` continues the turn, and a blocking hook can loop.
- **Decision:** Warn = exit 0 with JSON `{"systemMessage": "..."}`. Block = exit 2 with the message on stderr, only when `stop_hook_active` is false. Never exit 1.
- **Why:** `systemMessage` shows the user the gap without forcing more agent work, matching warn-by-default (Q11). Exit 2 is the documented block; checking `stop_hook_active` prevents loops.
- **Alternatives:** `hookSpecificOutput.additionalContext` for warn (continues the turn, so it acts like a soft block); `decision: "block"` JSON (same effect as exit 2, but exit 2 wins if both appear).
- **Impact:** Proof spec. Needs an observed test in follow-up bean `vantage-2vdj` before Phase 1 ships the gate.

### D61. Claude Code OpenTelemetry as an optional local source

- **Status:** accepted 2026-10-14 (was proposal P9).

- **Context:** Operations listed Claude Code's OTel export as "to be verified". R2 confirmed OTLP/HTTP JSON reaches a receiver on `127.0.0.1:4318`, with `session.id` and `prompt.id` on every record, and identity attributes (`user.email`, account ids) too.
- **Decision:** An opt-in local OTLP receiver adds token and cost, tool result and Claude Code hook timing data. It binds to `127.0.0.1`, drops identity attributes on ingest, and keeps Claude Code's default redaction. It is a supplement; hooks and transcripts stay the spine.
- **Why:** It gives cost and hook latency that hooks don't carry, at no polling cost. It is off by default in Claude Code and redacts commands and paths, so it can't replace hooks.
- **Alternatives:** Parse token usage from transcripts only (no hook timings); require OTel (extra setup for every user).
- **Impact:** Operations spec; `vantage init` writes user settings `env`; Code tab may need managed settings (Q29).

### D62. Svelte for the web UI

- **Context:** Open question Q17 asked which UI framework to use; the UI must be fast, keyboard-first and built on theme tokens.
- **Decision:** Svelte (with Vite) for the local web UI.
- **Why:** Small bundles and fast updates suit a calm, always-open local page; components map cleanly to the dot alphabet and theme tokens.
- **Alternatives:** React (larger ecosystem, heavier); Solid (fast, smaller community); plain web components (more hand-written plumbing).
- **Impact:** Phase 1 scaffolds a Svelte app served by the daemon. Revisit if a needed component library exists only for React.

### D63. npm package for install

- **Context:** Open question Q18 asked whether to ship an npm package or a single binary.
- **Decision:** Ship Vantage as an npm package, run with `npx vantage add` and installed globally on request.
- **Why:** Simplest for a personal tool on Node, matches the install-by-prompt flow (D52) and needs no build pipeline per OS.
- **Alternatives:** A single binary (no Node needed, but per-OS builds and signing).
- **Impact:** Requires Node 20+; release CI publishes to npm later. Revisit a binary if Vantage becomes a product (D18).

### D64. Oxc tools for lint and format

- **Context:** The Phase 1 scaffold (bean `vantage-vnn4`) needs a linter and a formatter. The bean assumed ESLint.
- **Decision:** Use the Oxc family: Oxlint with type-aware rules (`--type-aware`) for lint, and Oxfmt for format. No ESLint or Prettier. `tsc --noEmit` stays the type check.
- **Why:** The user's choice. Both are Rust tools that run in milliseconds, which keeps local checks and CI fast. Type-aware linting is stable since July 2026 and covers 59 of typescript-eslint's 61 type-aware rules. Oxfmt passes Prettier's JS and TS conformance tests.
- **Alternatives:** ESLint with typescript-eslint and Prettier (mature, but much slower and more config); Biome (one tool, but a smaller type-aware rule set).
- **Impact:** Oxfmt is still beta (0.x), so pin exact versions and expect small format churn on upgrades. A Svelte rule or plugin that only exists for ESLint is not available; revisit if the UI needs one, or add ESLint for `.svelte` files only.

### D65. shadcn-svelte for UI components

- **Context:** D62 picked Svelte but no component library. The UI needs accessible, keyboard-first components that follow Vantage's theme tokens and dot alphabet.
- **Decision:** Use shadcn-svelte (components copied into the repo, built on Bits UI) with Tailwind CSS. Theme tokens become Tailwind CSS variables.
- **Why:** The user's choice. The code lives in the repo, so it can be restyled to look calm and custom; Bits UI provides keyboard and accessibility behavior; it has the largest Svelte community.
- **Alternatives:** Ark UI (strong accessibility and the same API across frameworks, but unstyled and a smaller Svelte community); Bits UI or Melt UI alone (more hand work); Skeleton or Flowbite Svelte (look generic, fight custom themes); daisyUI (CSS only, no behavior).
- **Impact:** Adds Tailwind to the stack and the scaffold. Copied components are ours to maintain; updates are pulled by hand. Revisit if Tailwind fights the theme tokens or the UI moves to React (D62).

### D66. pnpm workspaces on Node

- **Context:** The Phase 1 scaffold has five packages (core, daemon, hooks, cli, ui) and needs a package manager. Bun was also raised, as package manager and runtime.
- **Decision:** pnpm workspaces for development, pinned with `packageManager`, exact versions and `minimumReleaseAge: 1440`. Node stays the runtime; users still install from npm (D63).
- **Why:** The user's choice. First-class workspaces and filters, strict dependencies (no undeclared imports), a shared store, install scripts blocked unless allowed, and a delay on brand-new releases as a supply-chain guard.
- **Alternatives:** npm workspaces (works, but flat `node_modules` hides missing dependencies and every install script runs); Bun (fastest installs and about 10 ms startup, but as runtime it conflicts with `npx` install (D63) and has more Windows edge cases).
- **Impact:** Contributors need pnpm (corepack). Revisit Bun for a compiled hook binary only if Node hooks miss the 100 ms budget.

### D67. One Settings view for engines, budgets and data policy

- **Context:** The design chose no model and had no place to see or control one. Explain layer 4 (D46), the judgment layer (Q4) and embeddings (Q25) all depend on engine choices, and the company data policy (`vantage-h8fv`) is undecided. UX listed settings without model fields.
- **Decision:** Add a Settings tab on the Sources page, specified in [settings](specs/settings.md). It holds Engines (one row per AI-assisted job), Budgets (daily runs and fallback order) and a Data policy (a master switch for outside calls plus one switch per kind of content: code, transcripts, chat, tickets). Everything that leaves the machine defaults to off. Values live in `~/.vantage/config.toml`, edited through `GET` and `POST /api/settings`.
- **Why:** The user decides what may leave the machine, in one place, before any engine runs. It keeps D10 (scores in code) and the privacy rules visible instead of buried in specs, and it lets the open model choices (Q4, Q25) land as a setting later without a redesign.
- **Alternatives:** A config file only (works, but hides what is on and what is sent); a per-feature toggle on each page (scatters privacy controls); hard-coding Haiku or one vendor (breaks the official-CLI rule and the user-chosen order in D46).
- **Impact:** New spec and API rows, with links from UX, operations and the README. No code yet. Revisit when Q4 or Q25 is answered, when `vantage-h8fv` records the company policy (its answer may change the defaults), or if the file and the `settings` table in [data schema](specs/data-schema.md) must be reconciled.

---

## Proposed (pending confirmation)

None right now.
