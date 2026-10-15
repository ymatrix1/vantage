# Decisions

Every decision records five things:

- **Context:** the situation and problem that forced a choice.
- **Decision:** what was chosen, stated precisely.
- **Why:** the reasoning that made this option win.
- **Alternatives:** what else was considered and why it lost.
- **Impact:** what this changes or commits us to (docs, code, scope, cost, risk), and what would make us revisit it.

Proposals the user hasn't confirmed live under [Proposed](#proposed-pending-confirmation) in the same format.

Each decision also carries its lifecycle, checked by `tools/check_docs.py`:

- **Status:** `proposed`, `accepted`, `superseded` or `rejected`, optionally followed by a date and a note (`accepted 2026-10-14`).
- **Decided by:** who accepted or rejected it (a person; for an agent's proposal that the user merged, name the PR). Not needed while `proposed`.
- **Superseded by:** a later decision id (`D70`), required when the status is `superseded`.

Rules:

- Only the user moves a decision to `accepted` or `rejected`. An agent writes `proposed` and puts it under [Proposed](#proposed-pending-confirmation).
- An accepted decision is frozen. CI rejects any change to its text or its removal; only the `Status`, `Decided by` and `Superseded by` lines may change.
- A changed decision is a new decision. Add it, mark the old one `superseded`, and name the new id in `Superseded by`.
- Not an item-level record: the product's own decision log for work items has a different lifecycle (see [decision log](specs/decision-log.md)).

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
| [D67](#d67-spool-hook-runs-built-javascript-native-binary-deferred) | 2026-10-14 | Spool hook runs built JavaScript; native binary deferred |
| [D68](#d68-one-settings-view-for-engines-budgets-and-data-policy) | 2026-10-14 | One Settings view for engines, budgets and data policy |
| [D69](#d69-decisions-have-a-status-an-owner-and-are-frozen-once-accepted) | 2026-10-14 | Decisions have a status and an owner, and are frozen once accepted |
| [D70](#d70-shell-writes-count-as-edits-only-inside-the-repo) | 2026-10-14 | Shell writes count as edits only inside the repo |
| [D71](#d71-phase-1-stage-machine-rules-the-specs-left-open) | 2026-10-14 | Phase 1 stage machine rules the specs left open |
| [D72](#d72-ship-the-spool-hook-as-a-rust-binary-in-per-os-npm-packages-with-a-node-fallback) | 2026-10-14 | Ship the spool hook as a Rust binary in per-OS npm packages, with a Node fallback |
| [D73](#d73-how-the-phase-1-stop-gate-reads-state-and-takes-its-mode) | 2026-10-14 | How the Phase 1 Stop gate reads state and takes its mode |
| [D74](#d74-status-line-reads-a-daemon-written-summary-file-phase-1-glyph-and-fallback-rules) | 2026-10-14 | Status line reads a daemon-written summary file; Phase 1 glyph and fallback rules |
| [D75](#d75-phase-1-track-page-and-local-server-rules-the-specs-left-open) | 2026-10-14 | Phase 1 Track page and local server rules the specs left open |
| [D76](#d76-the-native-hook-hands-stop-to-the-node-entry-and-spools-every-other-event-itself) | 2026-10-14 | The native hook hands Stop to the Node entry and spools every other event itself |
| [D77](#d77-capture-accuracy-repo-root-from-scanned-worktrees-test-counts-from-runner-summaries) | 2026-10-14 | Capture accuracy: repo root from scanned worktrees, test counts from runner summaries |
| [D78](#d78-phase-1-daemon-runtime-one-process-lock-and-health-files-vantage-start-and-vantage-open) | 2026-10-14 | Phase 1 daemon runtime: one process, lock and health files, `vantage start` and `vantage open` |
| [D79](#d79-how-vantage-add-edits-machine-settings-marker-manifest-backup-opt-in-git-hooks) | 2026-10-14 | How `vantage add` edits machine settings: marker, manifest, backup, opt-in git hooks |
| [D80](#d80-the-installer-picks-the-native-hook-by-lookup-in-a-fixed-order-and-doctor-nudges-when-it-is-unused) | 2026-10-14 | The installer picks the native hook by lookup, in a fixed order, and doctor nudges when it is unused |
| [D81](#d81-live-updates-get-apilive-with-the-token-in-the-subprotocol-and-a-dependency-free-send-only-socket) | 2026-10-14 | Live updates: `GET /api/live` with the token in the subprotocol and a dependency-free send-only socket |
| [D82](#d82-ui-component-tests-vitest-project-with-happy-dom-and-sveltes-own-mount) | 2026-10-14 | UI component tests: Vitest project with happy-dom and Svelte's own `mount` |
| [D83](#d83-plugin-commands-are-vantagecommand-add---yes-is-never-pre-approved) | 2026-10-14 | Plugin commands are `/vantage:<command>`; `add --yes` is never pre-approved |
| [D90](#d90-issues-live-in-the-users-tracker-vantage-only-syncs-them) | 2026-10-14 | Issues live in the user's tracker; Vantage only syncs them |

---

### D1. Track work items, not sessions

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** The user runs many Claude Code and Codex sessions in parallel and loses track of what was asked, built and shipped. Tools like Agent View, Pane, Vibe Kanban and Conductor already show sessions.
- **Decision:** Vantage's core object is a work item (one goal, one card). Sessions are evidence attached to items.
- **Why:** The pain is "what's the true state of my work", not "which terminal is busy". One goal often spans several sessions, agents and days.
- **Alternatives:** A better session dashboard (already well served by existing tools); a chat-history browser (more text, not less).
- **Impact:** Requires a linker that attaches events to items (see D25), which becomes the hardest part of the system. Positions Vantage away from crowded session managers.

### D2. The six-step track

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** The pains (lost state, unproven claims, review loop, nothing checked after release) needed one visual model that's easy to read.
- **Decision:** Every own-work item moves along Asked → Built → Proven → Reviewed → Shipped → Verified.
- **Why:** One spine shows where each item really is and exposes each pain as a stuck or flagged step.
- **Alternatives:** Free-form statuses (no shared meaning); a five-step track ending at Shipped (hid the "merged isn't working" pain, see D6).
- **Impact:** All UI, scoring and specs use these six names. Becomes the A2V track (D29). Changing a step later means changing every doc and the stage machine.

### D3. Cards move only on evidence

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** Agents often claim "done, fixed, optimized" without running anything.
- **Decision:** A step completes only when its evidence exists (diff, captured check, review, deploy, monitoring). Agent text never moves a card.
- **Why:** Fixes the "trust me" problem at the root instead of asking the user to double-check every claim.
- **Alternatives:** Trust agent status with spot checks (keeps the burden on the user); ask the agent to self-report proof (easy to fake).
- **Impact:** Every stage needs a defined evidence source and adapter. Some items will look "behind" until checks run, which is intended.

### D4. Proof expires

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** A test that passed before a later edit says nothing about the new code.
- **Decision:** Any linked edit after the latest proof moves the card from Proven (or Reviewed) back to Built.
- **Why:** Proof of old code isn't proof of new code.
- **Alternatives:** Keep proof until the next commit (too lax); expire on any edit anywhere in the repo (too noisy).
- **Impact:** Needs code fingerprints per proof (see D28). Cards may move backward, so the UI must show it clearly rather than silently.

### D5. Review loop stays inside Reviewed

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** Reviews loop: changes requested, fixes, re-review, sometimes several rounds.
- **Decision:** The card stays in the Reviewed column through the loop, with sub-states (waiting, changes requested, fixing, re-review requested, approved).
- **Why:** Bouncing cards between Built and Reviewed on every round adds noise and stress.
- **Alternatives:** Move back to Built on "changes requested" (more literal, but churny).
- **Impact:** The stage machine has sub-states for Reviewed only. Fix edits during review still expire proof (D4), shown inside the Reviewed row.

### D6. Shipped means deployed; Verified means checked

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** Merged code can still fail in production; regressions often surface days later.
- **Decision:** Shipped needs merge plus a deploy event. Verified needs post-deploy checks and a clean monitoring window (default 2 days).
- **Why:** Merged isn't the same as working.
- **Alternatives:** End the track at merge (hides production problems).
- **Impact:** Adds CI/CD and monitoring sources to the architecture and Phase 5 to the roadmap. Repos without deploy or checks show these steps hollow (D8).

### D7. Regressions spawn follow-up cards

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** A problem found after release could either reopen the original card or create new work.
- **Decision:** A regression adds a red flag to the original card and creates a linked follow-up card in Asked.
- **Why:** Keeps an honest record of what shipped and avoids finished work silently coming back.
- **Alternatives:** Reopen the original card to Built (history in one place, but "done" stops meaning done).
- **Impact:** Work items get a `parent_id`. Effort of follow-ups rolls up to the parent in the spread bar.

### D8. Honest dots

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** Some repos have no PR step, no deploy or no checks.
- **Decision:** Skipped or unconfigured steps are drawn hollow, never green.
- **Why:** Green must always mean "evidence exists".
- **Alternatives:** Hide steps that don't apply (inconsistent rows); mark them green (dishonest).
- **Impact:** The UI needs a distinct "skipped" style in every theme (D27 guardrails).

### D9. Parked only by the user

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** Old ideas and stalled work could be auto-hidden to reduce noise.
- **Decision:** Only the user parks an item. Vantage never hides work on its own.
- **Why:** Auto-hiding is how things get forgotten, the exact pain Vantage fixes.
- **Alternatives:** Auto-archive after N days of inactivity.
- **Impact:** Stale items raise the `forgotten` flag instead; Focus and digest must keep that noise low.

### D10. Scores computed in code

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** Priority, difficulty and flags could be produced by an LLM or by explicit rules.
- **Decision:** Scores come from explicit signals computed in code. LLM or judgment models only answer fuzzy yes/no questions behind one interface.
- **Why:** Explainable ("why is this ranked here?"), cheap, testable and deterministic.
- **Alternatives:** LLM ranking of all work (opaque, costly, unstable).
- **Impact:** Each score must show its reasons in the UI. A judgment layer is optional and gated by the data policy decision.

### D11. Local-first

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** Vantage reads code, transcripts, Slack, Jira and monitoring, all company data.
- **Decision:** All data stays on the user's machine by default. Remote sources are read-only unless the user acts.
- **Why:** Company data policy and the user's trust.
- **Alternatives:** A hosted service (easier sync and webhooks, but a data and compliance problem).
- **Impact:** No cloud backend; webhooks need an optional relay (D20); multi-machine sync is out of scope.

### D12. Build order

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** Many sources; building all at once is too much.
- **Decision:** Local sources (agents, git) → GitHub → CI/CD and monitoring → issue tracker and Slack.
- **Why:** Each layer is useful alone, and the most reliable data comes first.
- **Alternatives:** Start with Jira or Slack (less reliable signals, more approvals needed).
- **Impact:** Sets the roadmap phases. Review features arrive in Phase 4, tracker and Slack in Phase 6.

### D13. Pluggable issue tracker

- **Status:** accepted 2026-10-13
- **Decided by:** user

- **Context:** Different projects use Jira or Linear.
- **Decision:** The issue tracker sits behind one adapter interface with Jira and Linear implementations.
- **Why:** Nothing else in the model should depend on which tracker is used.
- **Alternatives:** Jira only (excludes Linear projects).
- **Impact:** Anchors use a generic `issue_key`; scoring reads priority, due date and relations through the adapter.

### D14. Six pages

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The UI needed to stay calm and easy while covering many needs.
- **Decision:** Focus, Track, Item, Journal, Inbox, Sources, plus status line, toasts and badge.
- **Why:** One question per page keeps each screen simple.
- **Alternatives:** One big dashboard (crowded); many specialized pages (hard to navigate).
- **Impact:** Defines the UI scope for Phases 2 and 3.

### D15. Track is rows, not a board

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Options were a Trello-like board, a graph, rows with a stage track, or a timeline.
- **Decision:** Track is a table of rows with an inline six-dot track. Board is an optional toggle; a graph appears only inside Item.
- **Why:** Rows scale past 15 items, keep priority visible and scan quickly.
- **Alternatives:** Board (noisy at scale); graph (hard to scan, unstable layout).
- **Impact:** The row and dot components are the core UI building blocks.

### D16. Group by attention by default

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Work spans several projects and both work and personal contexts.
- **Decision:** Default grouping is by attention (needs you, in progress, waiting on others, done). Group by project or stage is a toggle. Projects are Jira epics, Linear projects or repo groups; contexts (Work, Personal) sit above.
- **Why:** Stress comes from attention jumping across projects; projects still matter for overview.
- **Alternatives:** Group by project by default (hides urgent items across projects).
- **Impact:** Adds `context` and `project` to the data model and a context switch to the UI.

### D17. SQLite live, DuckDB for analysis

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The user asked whether DuckDB would be faster than SQLite.
- **Decision:** SQLite in WAL mode is the live store. DuckDB is used for analysis and Phase 0 measurement.
- **Why:** The live workload is small transactional writes and key lookups, where SQLite excels and allows concurrent readers. DuckDB is built for large scans and can query SQLite and `.jsonl` directly.
- **Alternatives:** DuckDB as the only store (single-writer lock, slower small writes).
- **Impact:** Two engines, each in its strength. Revisit if analytics move into the live UI at large scale.

### D18. Personal tool first

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Earlier brainstorming discussed selling Vantage; the PRD described one user.
- **Decision:** Build for one user first, without blocking a product later.
- **Why:** Keeps setup, OS support and polish minimal while the idea is proven.
- **Alternatives:** Product from day one (more onboarding, cross-OS and licensing work up front).
- **Impact:** Windows first, minimal setup. The method is documented separately so it can be sold later (D29).

### D19. Pull is the backbone

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The laptop sleeps, restarts and goes offline; push channels miss events while it's off.
- **Decision:** Every source supports catch-up from a stored cursor. Push channels only make updates arrive faster.
- **Why:** Nothing should be lost.
- **Alternatives:** Push-only (loses events while offline).
- **Impact:** Every adapter implements `catchUp(cursor)`; polling budgets per source (see ingestion spec).

### D20. No public endpoint by default

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Webhooks need an internet-reachable URL.
- **Decision:** Nothing listens on the internet by default. Webhooks only through an optional relay, later.
- **Why:** Local-first (D11) and company data.
- **Alternatives:** A hosted relay from the start (faster updates, but company data passes through a service).
- **Impact:** Slightly slower updates for GitHub, Jira, Linear and monitoring. Relay needs company approval (Q13).

### D21. Hooks only append to a spool file

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Claude Code and git hooks run inside the user's workflow on every action.
- **Decision:** Hooks append one line to a local spool file and return in under 100 ms. The daemon reads the spool.
- **Why:** Never slow down or break an agent, even when the daemon is down.
- **Alternatives:** Hooks write to the database or call the daemon directly (slower, fails when the daemon is down).
- **Impact:** A spool reader in the daemon; a performance test for hooks.

### D22. GitHub notifications as the main GitHub trigger

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** GitHub events could come from webhooks, broad API polling or the Notifications API.
- **Decision:** Poll the Notifications API with conditional requests; fetch thread details on demand.
- **Why:** It's already filtered to what involves the user, carries read state, and unchanged polls don't count against rate limits.
- **Alternatives:** Webhooks (need a public endpoint); polling every repo (wasteful).
- **Impact:** Coverage must be verified (research R4). Gives "seen" state for free.

### D23. Slack via Socket Mode

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Slack mentions and commitments need near real-time detection without a public URL.
- **Decision:** Use a Slack app with Socket Mode and user-scoped events if approved; otherwise poll search.
- **Why:** Real time with no public endpoint.
- **Alternatives:** Events API webhooks (need a public URL); search polling only (slower, rate-limited).
- **Impact:** Needs workspace admin approval (decision bean). Fallback keeps Slack working without it.

### D24. Four item kinds

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Not everything needing attention is the user's own code: review requests and promises matter too.
- **Decision:** Item kinds `own_work`, `review_request`, `commitment`, `follow_up`, with shorter tracks for review requests and commitments.
- **Why:** Reviews and promises are a big source of stress and get forgotten.
- **Alternatives:** Only own work (misses a large part of the pain).
- **Impact:** UI shows short tracks; scoring treats "someone is blocked on you" as a top priority signal.

### D25. Work item boundary rules

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** One session can touch two tickets; one ticket can span many sessions.
- **Decision:** Issue key wins, then branch or worktree, then provisional per-session items. User Split and Merge always win.
- **Why:** Deterministic for most work (agents mostly run in worktrees), correctable for the rest.
- **Alternatives:** LLM-only grouping (costly, error-prone); one item per session (fragments work).
- **Impact:** The linker is anchor-first. Rules will be validated against real data in research R1.

### D26. Agent setup ported from PortPS5

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The user already has a working agent setup in another repo.
- **Decision:** `AGENTS.md` as canonical instructions, shared `.agents/rules` and `.agents/skills`, beans for task tracking, `beans prime` hooks. No Ouroboros.
- **Why:** One familiar setup across projects and agents.
- **Alternatives:** A Vantage-only setup; keeping Ouroboros (the user removed it).
- **Impact:** All task work goes through beans with the structured template; skills are shared across agents.

### D27. Calm default look and custom themes

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The user likes Pane's calm Folio theme and wants personalization.
- **Decision:** A calm default inspired by Folio, with token-based themes and user custom themes that may change style but not meaning (contrast and distinguishability checked).
- **Why:** Calm is a product goal; status colors carry meaning that must survive any theme.
- **Alternatives:** One fixed theme (no personalization); free-form CSS themes (can break meaning).
- **Impact:** All UI colors come from tokens; a theme loader with checks; research R11 for the palette. Pane is AGPL, so inspiration only.

### D28. Proof is first-class

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Proof rules were spread across several docs; proof is the heart of evidence over claims.
- **Decision:** Proof gets its own spec: types, levels L0–L4, freshness by code fingerprint, fake proof detection. Agents can only reference proof Vantage captured.
- **Why:** Proof must be hard to fake and visible when weak.
- **Alternatives:** A single "tests passed" flag (hides weak proof, easy to fake).
- **Impact:** A proof record and fingerprinting in the data model, a Proof section on the Item page, and new Track filters.

### D29. The method is named A2V

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The user wants a name for the method that could be sold later.
- **Decision:** **A2V: Asked to Verified**, documented in `docs/METHOD.md` separately from the product, always written in full the first time.
- **Why:** Short, names the track itself, works as a badge. Common phrases (evidence-driven, proof-driven, receipts) are already taken.
- **Alternatives:** Proofwork, Evident.
- **Impact:** Docs refer to "the A2V track". An unrelated "Agility to Value (A2V)" framework exists, so a trademark and domain check is required before selling (bean `vantage-uye1`).

### D30. Decisions record context, why, alternatives and impact

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The decision log was a one-line table that lost the reasoning behind each choice.
- **Decision:** Every decision and proposal records Context, Decision, Why, Alternatives and Impact.
- **Why:** Future readers (the user, agents, buyers of the method) need to know why, what else was considered, and what each choice commits us to.
- **Alternatives:** A short table (fast, but loses context).
- **Impact:** Longer log; rules and the `update-spec` skill enforce the format.


### D31. Phase 1 is a thin usable slice

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Only Phase 0 was broken into tasks; Phase 1 mixed infrastructure with UI and had no clear minimum.
- **Decision:** Phase 1 covers only Claude Code and git, only Asked, Built and Proven, the warn-mode gate, the status line and a minimal Track page.
- **Why:** Get to daily use fast; the kill rule (PRD) needs a usable version to judge.
- **Alternatives:** Build infrastructure first and UI later (no feedback for weeks).
- **Impact:** GitHub, reviews, ship stages, Focus and trackers move to later phases. Phase 1 beans come from this list.

### D32. Local server is locked down

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** A localhost web UI with work data can be reached by other local programs and, through the browser, by malicious sites.
- **Decision:** Bind to 127.0.0.1, require a per-install token, check Origin and Host, no CORS, no state changes on GET, user-only file permissions.
- **Why:** Vantage holds company data; a local page is not automatically private.
- **Alternatives:** No auth because it's localhost (open to DNS rebinding and cross-site requests).
- **Impact:** Token handling in the UI launch flow and in every request; tests for rejected origins.

### D33. Events are the source of truth

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Bugs in the linker or scorers could corrupt derived state.
- **Decision:** Events and user actions are immutable; every other table can be rebuilt by replaying them. Merges link through PR numbers and branches, not commit ids.
- **Why:** Safe recovery and testable logic; squash merges and rebases change commit ids.
- **Alternatives:** Mutable state only (no recovery); commit-id linking (breaks on squash).
- **Impact:** Replay command and fixtures; schema in `docs/specs/data-schema.md`.

### D34. Visual first with a dot alphabet

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The user wants to read less: colors, drawings and visuals instead of text. A first attempt removed titles and used emoji, which made items unidentifiable and rendered inconsistently.
- **Decision:** Shape, color, size and position carry state; 2–4 word titles carry identity; about 30 words per screen. Six dot states differ by shape first, then color. Proof level shows as 1 to 4 green arcs around the Proven dot (count, not shine, which blurred at small sizes). Flags use one line-icon set, never emoji.
- **Why:** Glanceable without losing identity; works for colorblind users and any theme; ties the reward (more arcs) to the A2V method.
- **Alternatives:** No text at all (items can't be told apart); text-heavy cards (the original pain).
- **Impact:** A shared component set used by every page and the status line; [visual language spec](specs/visual-language.md).

### D35. Landscape home with dot characters

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** A visual list was still a list, and the product name (a view from a high point) was unused. OpenAI's dots showed characters as the things themselves.
- **Decision:** Each work item is a dot character (body = project, ring = A2V track, face = attention, badge = reason). Focus is a landscape: needs-you in the foreground, moving in the middle, waiting on the horizon, verified as stars, parked on a shelf. Track rows remain the fallback.
- **Why:** Spatial memory and depth show urgency at a glance; the metaphor matches the name; it makes progress feel tangible.
- **Alternatives:** Styled list (still a list); free-floating graph (unstable, hard to scan).
- **Impact:** Caps per band, stable placement, scene palettes per time of day and theme. Must pass a scale test (Q20) before Phase 3a.

### D36. Calm gamification rules

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The user wants a more gamified, less stressful app.
- **Decision:** Reward good practice, never volume or speed: proof arcs, stars for verified work, gentle streaks that pause instead of breaking, rare badges for A2V practices, an evening landing that closes open loops. No leaderboards, points for commits or lines, breaking streaks or random rewards. Quiet mode turns it off.
- **Why:** Visible small wins and closure lower stress; loss mechanics and comparison raise it.
- **Alternatives:** Classic points and leaderboards (stressful, rewards the wrong thing).
- **Impact:** Moments (verified, regression, landing, morning) become UI features in Phase 3c.

### D37. Explain through the connected agent

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** People with little time need status explained top-down, McKinsey-style (answer first, SCR, MECE), with the option to drill into detail.
- **Decision:** An Explain quick action runs the user's connected agent headless (for example `claude -p`) on Vantage's structured facts. The model returns typed blocks (headline, SCR, tree, missing, diagram, example, follow-ups) that Vantage renders. Every claim cites evidence or is dropped. Issue trees start collapsed and expand on click; MECE is checked silently by Vantage. Two trees: *why we built it* (frozen intent) and *where it stands* (live). The engine part is refined by D46.
- **Why:** Uses tools the user already pays for; keeps the model from deciding status; progressive disclosure serves both the 30-second reader and the deep dive.
- **Alternatives:** Free-form LLM summaries (unverifiable, can invent status); a separate API key and model (more cost and setup).
- **Impact:** A JSON schema, renderer components and caching; gated by the data policy decision; [Explain spec](specs/explain.md).

### D38. Track pings; draft, never send

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Work stalls on people: questions seen but not answered, reviews nobody picked up, finished work nobody was told about. `unseen_mention` cleared once a message was seen, even without a reply.
- **Decision:** Three flags: `owe_reply`, `follow_up_due`, `close_the_loop`, with working-hour thresholds. One click drafts the message in the right place; the user always sends it. Flags clear only when Vantage sees the user's message in the source.
- **Why:** Owed replies and silent waits are a large, invisible source of stress and delay; drafting removes friction while keeping the user in control of what's said.
- **Alternatives:** Only track unseen mentions (misses seen-but-unanswered); auto-send nudges (risky, impersonal, could embarrass the user).
- **Impact:** Question detection rules plus an optional judge (data policy), thresholds per case, Inbox sections and landscape badges; [pings spec](specs/pings.md).

### D39. Landscape scene rules from the 25-item test

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** D35 required the landscape to pass a scale test (Q20). A render with 25 items showed green grass hiding the green done arcs, rings merging with the dot body, badges covering arcs, and cryptic corner labels.
- **Decision:** Neutral ground (no meaning colors in scenery); a clear gap between body and ring; white arcs for remaining steps; badges just outside the ring; "+N" overflow labels; moon and shelf icons with counts in the corners. Band caps (3 foreground, 8 middle) confirmed.
- **Why:** With these fixes the 25-item view stays readable at a glance and green keeps one meaning.
- **Alternatives:** Green landscape (breaks the color meaning); no ring for remaining steps (loses "out of six"); gray dots for remaining steps (worked, but the white ring with spacing reads more naturally).
- **Impact:** Closes Q20. Scene palettes for dusk, night and dark mode still to design in the UI phase.

### D40. Measure felt load, not just usage

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The product's promise is less stress, but the success metrics only measured usage and speed.
- **Decision:** The evening landing ends with an optional one-tap check: "How heavy does work feel? 1–5." Stored locally; the PRD tracks its trend over the first month.
- **Why:** Daily use proves habit, not relief. The core promise needs its own measure.
- **Alternatives:** Usage metrics only (can't tell relief from compulsion); long surveys (nobody fills them in).
- **Impact:** A `mood_checks` table, one step in the landing, a PRD metric.

### D41. Status line uses text glyphs

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The terminal status line is always visible but can't draw the SVG dot alphabet; some terminals have no color.
- **Decision:** Map dot states to Unicode shapes (● ◉ ◐ ◍ ◌ ○), with color optional and proof level as a superscript digit. Layout drops segments from the right to fit.
- **Why:** Keeps the shape-first rule (D34) in the terminal, with no emoji and no dependency on color.
- **Alternatives:** Words only (more reading); emoji (inconsistent across terminals).
- **Impact:** [Status line spec](specs/status-line.md); glyph rendering tests.

### D42. A decision log for every AI and person decision

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Decisions were scattered: the `ai_decided` detector covered business rules in diffs, `user_actions` logged raw actions, and choices made in agent chats, PR reviews or Slack were invisible.
- **Decision:** A readable, append-only decision log per item, project and week. Each record has Context, Decision, Why, Alternatives, Impact, who (AI or person) and status. AI decisions start as proposed and need a person's approval or change. Unstated fields are marked "not stated", never invented.
- **Why:** Silent AI decisions are a core pain; people's decisions get lost across tools. One log answers "who decided this and why?" and makes AI choices reviewable.
- **Alternatives:** Only the diff-based detector (misses chat decisions); a free-text notes field (unstructured, unsearchable).
- **Impact:** A `decisions` table, transcript and message detectors, Item page section, landscape badge, API routes; [decision log spec](specs/decision-log.md). Uses the same five fields as D30.

### D43. Guard the scope

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Planning added many features (pings, Explain, decision log, gamification, landscape) without measuring anything yet. Phase 0 grew from 2 days to 14 research beans; Phase 3 held everything visual with no cut line.
- **Decision:** Phase 0 is timeboxed to one week with four must-have beans (R1, R2, R4, R13); the rest wait for the phase that needs them. Phase 3 splits into 3a (landscape), 3b (understanding) and 3c (calm), each with its own exit criterion. The PRD lists what's deliberately not in v1. Flags live in one registry.
- **Why:** The kill rule only works if there's an early, small version to judge. Most open questions need real data, not more design.
- **Alternatives:** Keep planning until every question is answered (delays learning); build everything in one Phase 3 (no early stop point).
- **Impact:** Roadmap and PRD updated; [flag registry](specs/flags.md) replaces the flag tables in other specs. Next step is Phase 0, not more planning.

### D44. A daemon plus one Claude Code plugin

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The user asked whether Vantage should be built as MCP, skills, or something else.
- **Decision:** The core is a local daemon with a web UI. Claude Code integration ships as one plugin: hooks for capture and the proof gate, a status line, skills that teach the A2V method, and MCP config for agents to cooperate. Explain runs in layers, with headless `claude -p` only as an opt-in fallback (D46).
- **Why:** Skills and MCP are passive; they act only when an agent chooses to, and agents forget. Hooks and a daemon are deterministic, which is what evidence over claims needs.
- **Alternatives:** Skills only (advisory, easy to ignore); an MCP server only (no always-on capture); a desktop app with no Claude Code integration (misses live events).
- **Impact:** Two deliverables to install (plugin and daemon) via `vantage init`; the MCP server (D48) arrives in Phase 3b.

### D45. Local-only telemetry

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** An always-on daemon needs debugging; the resource budget said "no telemetry".
- **Decision:** Structured logs, metrics and per-event traces are kept locally with retention limits. Nothing is sent anywhere. A scrubbed debug bundle is created only on the user's command. Every card can show "why did this change?" from its trace.
- **Why:** Debugging and trust both need to see what happened; sending data out would break local-first (D11).
- **Alternatives:** No telemetry (blind debugging); remote telemetry (company data leaves the machine).
- **Impact:** Logs, metrics and trace storage; Diagnostics tab; `vantage doctor` and `vantage debug-bundle`; an optional local OTLP receiver for Claude Code's own telemetry (R2).

### D46. Explain runs in layers; headless is opt-in

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** D37 had Explain call the agent headless (`claude -p`) on every use. The user asked whether hooks and existing sessions could avoid that, and headless use may be billed separately in future.
- **Decision:** Four layers: (1) evidence-only Explain built from Vantage data, on by default; (2) byproduct capture, where agents record decisions and summaries through a skill and MCP during normal work; (3) in-session Explain through a slash command; (4) headless `claude -p` or `codex exec` only as an opt-in fallback, with official CLIs only, a user-chosen order, a daily budget and caching.
- **Why:** Most daily needs (status, what's missing, what needs you) come straight from evidence; narrative can come from sessions already running. No separate AI calls by default protects the user's limits and avoids billing risk.
- **Alternatives:** Headless on every Explain (D37 as written; costs and limits); no AI at all (loses diagrams, examples and the why tree draft).
- **Impact:** Explain spec rewritten around layers; the web UI shows layer 1 instantly and hands off to a session; R2 checks prompt-type hooks, R13 checks the in-session flow and vendor policy.
### D47. Diff comments become prompts

- **Status:** accepted 2026-10-14 (was proposal V1); details confirmed by research R12.
- **Decided by:** user

- **Context:** Giving feedback on agent work means switching to the right terminal and explaining where. Vibe Kanban lets users comment on a diff and sends it to the agent.
- **Decision:** From the Item page, the user comments on a diff hunk and Vantage turns it into a prompt for the session that owns the item.
- **Why:** Fast feedback without switching terminals; Vantage stays a viewer that hands off, not an agent runner.
- **Alternatives:** No feedback path from Vantage (user copies context by hand).
- **Impact:** Needs a way to reach or resume the owning session; waits on research R12.

### D48. A Vantage MCP server

- **Status:** accepted 2026-10-14 (was proposal V2); details confirmed by research R12.
- **Decided by:** user

- **Context:** Agents could help structure work (behaviors, proof references, decisions) if they had a channel to Vantage.
- **Decision:** An MCP server where agents register behaviors, reference captured proof runs, propose items and ask the user for decisions. Agents can never move a stage.
- **Why:** Agents help with structure while status stays evidence-based (D3, D28).
- **Alternatives:** No agent channel; or let agents update status (breaks D3).
- **Impact:** New interface to secure and test; waits on research R12.

### D49. Visual proof by screenshot

- **Status:** accepted 2026-10-14 (was proposal V3); details confirmed by research R12.
- **Decided by:** user

- **Context:** UI changes are often best proven by looking. Vibe Kanban has a built-in preview browser.
- **Decision:** A `visual` proof type: a screenshot of the running app after the last edit, stored by Vantage. No browser inside Vantage.
- **Why:** Gives UI work real evidence without building a browser.
- **Alternatives:** A built-in preview browser (large scope); no visual proof.
- **Impact:** Screenshot capture method to choose; storage in `~/.vantage/`; waits on research R12.


### D50. One command to add an existing repo

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Most repos already exist with their own hooks and history; setup must be easy and safe there.
- **Decision:** `npx vantage add` (or `/vantage add` inside Claude Code) registers the repo, installs hooks once per machine (user-level Claude Code hooks, global git hooks that chain the repo's own), backfills 14 days of this repo's sessions and git history, and opens the landscape. Nothing in the repo changes unless the user opts in with `--team`.
- **Why:** One command removes friction; machine-level hooks avoid touching every repo; chaining keeps existing hook managers working.
- **Alternatives:** Per-repo hook files (pollutes repos, conflicts with Husky and Lefthook); manual setup (too much friction).
- **Impact:** An `add` command, hook chaining logic with tests for Husky and Lefthook, a `--dry-run` mode and an optional team config file.

### D51. Logo and wordmark

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The project needed a logo that is modern but calm and fits the vantage-point idea.
- **Decision:** A rounded-square icon of rolling hills at dusk under a warm sun, and a wordmark reading "Vantage" (capital V) in Bree Serif converted to outlines, with its cap height centered on the icon. Separate wordmark files for light and dark backgrounds.
- **Why:** The scene tells the product story (a calm view over your work) and reads at 16 px; Bree Serif is warm and calm, matching the goal of reducing stress.
- **Alternatives:** A dot character, a V monogram, layered V bands, an earthy palette (the user preferred the dusk colors), and the fonts Inter, Geist, Manrope, Outfit, Plus Jakarta Sans, Sora, Quantico, Chakra Petch, Zen Dots and Odibee Sans.
- **Impact:** `assets/` holds the icon and two wordmarks; a Brand section in the visual-language spec.

### D52. Install with a prompt

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The end goal is that installing Vantage takes one prompt to the agent the user already uses.
- **Decision:** Publish an agent-readable install guide (`docs/install-for-agents.md`) and a copy-paste prompt in the README. The agent checks prerequisites, shows a dry run, waits for the user's OK, installs, runs `vantage doctor` and reports what changed and how to undo it. It never adds credentials or commits.
- **Why:** Users already work through agents; a prompt is easier than reading setup docs, and the dry-run and OK steps keep machine-level changes under the user's control.
- **Alternatives:** Command-line install only (more friction); an agent installing silently (changes settings without consent).
- **Impact:** The install guide must stay in sync with the `add` command; Phase 1 tests it end to end in Claude Code and Codex.

### D53. The proof gate skips docs-only sessions

- **Status:** accepted 2026-10-14 (was proposal P1).
- **Decided by:** user

- **Context:** R1 ([baseline](research/baseline.md#unproven-edits-p2-q3)) found 16 edit sessions in 90 days whose edits were only documentation; 50% of them ended with no qualifying check, because no test or data check applies to prose.
- **Decision:** The `Stop` gate and `unproven_claim` ignore a session whose linked edits are all documentation files (`.md`, `.mdx`, `.txt`, `.rst`). Docs checks such as a link checker may still record proof when they run.
- **Why:** Warning where no qualifying check exists teaches the user to ignore the gate.
- **Alternatives:** Treat docs like code (noisy warnings); exempt by folder such as `docs/` (misses READMEs and misfires on generated code under docs).
- **Impact:** Small change to the gate in the [proof spec](specs/proof.md#the-gate). Revisit if docs gain executable checks (doctests, notebooks).

### D54. Events take the branch at event time

- **Status:** accepted 2026-10-14 (was proposal P2).
- **Decided by:** user

- **Context:** R1 ([baseline](research/baseline.md#mapping-to-an-anchor-q1-d25)) found 130 of 255 edit sessions saw more than one non-default branch. Sessions start in a worktree on one branch and create or switch to another.
- **Decision:** Under D25 rule 2, each event is linked by the branch recorded on that event, not by the session's first branch. A session that changes branch splits into the items of each branch; rule 6 still re-anchors renames.
- **Why:** Session-level branch assignment would merge unrelated work or attach work to a scratch branch.
- **Alternatives:** Use the session's last branch (wrong for early events); use the first branch (wrong for most switches); ask the user (too many prompts).
- **Impact:** The linker needs a per-event branch field (Claude Code lines carry `gitBranch`). Updates the [work item model](specs/work-item-model.md#boundary-rules). Revisit if switches turn out to be mostly renames.

### D55. Thrashing counts only failures not cleared by a passing check

- **Status:** accepted 2026-10-14 (was proposal P3).
- **Decided by:** user

- **Context:** R1 ([baseline](research/baseline.md#thrash-loops-p5)) found 0 sessions with 3+ cycles when any successful command resets the count, and 5 (2.0% of edit sessions) when only a passing qualifying check resets it.
- **Decision:** The `thrashing` flag keeps its threshold of 3 consecutive cycles on the same file. A cycle is edits to the file, then the commands until the next edit, with at least one failing command. Only a passing qualifying check (per the proof spec) resets the count.
- **Why:** Agents run harmless successful commands (`ls`, `git status`) between failures; letting those reset hides every loop.
- **Alternatives:** Reset on any success (never fires); a lower threshold of 2 (would flag 33 sessions in 90 days, mostly normal fix-and-retry).
- **Impact:** Sharpens the definition in [flags](specs/flags.md) and [behaviors and detectors](specs/behaviors-and-detectors.md). Revisit with labeled precision once hooks capture real exit codes.

### D56. GitHub notifications are a wake-up signal; state comes from GraphQL

- **Status:** accepted 2026-10-14 (was proposal P4).
- **Decided by:** user

- **Context:** D22 made the Notifications API the main GitHub trigger. R4 ([research](research/github.md)) found that every comment or review on the owner's PRs bumps the PR's thread (784 of 784 PRs), but the payload can't say what happened: one thread per PR, a sticky `reason` that later notifications overwrite, no review state, and no CI notifications (0 of 909 threads, despite recent Actions runs). 4 of 27 direct review requests had no thread.
- **Decision:** Keep D22 for *waking* the adapter. For every bumped PR thread, fetch a GraphQL snapshot (reviews, review threads, commits, timeline, `statusCheckRollup`) and derive events and Reviewed sub-states by diffing it against the stored snapshot. Never read an event from `reason`. Add slow reconcile polls: `review-requested:@me` every 5–10 min, CI rollup for open PRs (on bump, then 2–5 min while pending), authored-PR catch-up on start and hourly. Treat `X-GitHub-SSO` as a health warning.
- **Why:** It keeps the cheap, free-when-idle trigger (304s) and removes the dependence on a field that can't carry the meaning we need. The reconcile polls cover the measured gaps.
- **Alternatives:** Notifications only (misses CI, hides review state, drops Done threads); polling every PR on a timer (wasteful, more rate-limit risk); webhooks (public endpoint, company approval, out of scope for v1).
- **Impact:** The GitHub adapter does a snapshot diff and stores per-PR snapshots; [ingestion](specs/ingestion.md#github-adapter-rules-from-r4), [lifecycle](specs/lifecycle.md#reviewed-sub-states) and [pings](specs/pings.md) are updated to match. Requires a classic token. Revisit if event-to-bump delay measured in Phase 1 is too long, or if a webhook relay (Q13) is approved.

### D57. Vantage owns status and tree shape; the model writes text only

- **Status:** accepted 2026-10-14 (was proposal P5).
- **Decided by:** user

- **Context:** Research R13 ran `claude -p --json-schema` 20 times on one synthetic item. The output was always schema-valid, but the model chose three different headline statuses for identical facts and built trees with 2 to 5 branches, never by A2V step. See [Explain engine research](research/explain-engine.md).
- **Decision:** For layers 2–4, Vantage builds the status tree, the headline status and the `missing` list from evidence (layer 1) and sends them with node ids. The model returns only text keyed by those ids (headline text, SCR, node labels, follow-ups) plus the why tree, diagrams and examples. The output schema puts the input's evidence ids in an `enum`, and the flag and gate names in an `enum` for `missing`.
- **Why:** Enforces the spec's rule that the model never decides status, makes output stable between runs, and stops non-evidence ids at the schema.
- **Alternatives:** Keep model-built trees and check MECE afterwards (unstable, needs regroup retries); free-text evidence ids filtered after the fact (works, but wastes tokens on dropped claims).
- **Impact:** Explain spec block table and schema; the MECE regroup retry only applies to why trees and project or week groupings. Revisit if a re-test shows labels-only output loses useful narrative.

### D58. Headless Explain runs as an isolated background job

- **Status:** accepted 2026-10-14 (was proposal P6).
- **Decided by:** user

- **Context:** R13 measured a 52.5 s median and 76.2 s p95 for `claude -p` with Haiku. The CLI accepted an invalid schema silently, and `--bare` can't use a subscription login.
- **Decision:** Layer 4 runs as a background job with a 120 s timeout. It uses `claude -p --model haiku --output-format json --json-schema`, with `--tools ""`, `--strict-mcp-config`, `--setting-sources ""`, `--no-session-persistence` and an empty working folder; never `--bare`. Vantage validates its own schema at build time and every output itself. Any nonzero exit, `is_error: true`, timeout or failed validation is a failure: retry once only on validation failure, then follow the user's agent order, then layer 1.
- **Why:** Waiting about a minute on a click is too slow. Isolation keeps the user's settings, hooks and MCP servers out of the run and sends only the facts. Vantage-side validation covers the silent schema case.
- **Alternatives:** Synchronous click-and-wait (slow); `--bare` with an API key (separate billing, setup); trusting the CLI's schema check (it didn't catch an invalid schema).
- **Impact:** Explain spec engine and failure-mode sections; a job queue and a "ready" notification in the web UI. Revisit if latency drops below about 10 s.

From research [R2](research/claude-code-hooks.md), 2026-10-14.

### D59. Claude Code spool hooks run async

- **Status:** accepted 2026-10-14 (was proposal P7).
- **Decided by:** user

- **Context:** Hooks must finish in under 100 ms (D21). On the user's Windows laptop a Node append hook takes 97 ms median and 115 ms max before any real work, and the user's existing hooks already add seconds to `SessionStart`.
- **Decision:** Register every Vantage spool hook (`SessionStart`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `Notification`, `PreCompact`, `SessionEnd`) as a command hook with `"async": true`. Only the `Stop` gate runs synchronously.
- **Why:** Claude Code runs async hooks in the background, so the session never waits on Vantage, whatever the runtime costs. The spool append doesn't need to return anything.
- **Alternatives:** A native binary hook (faster but a second build target); a persistent helper process (more moving parts); synchronous Node hooks (no headroom on Windows).
- **Impact:** Ingestion and operations specs; the hook latency test measures the sync `Stop` hook only. Revisit if async hooks drop events or reorder them in a way the spool can't fix (Q28).

### D60. Stop gate output contract

- **Status:** accepted 2026-10-14 (was proposal P8).
- **Decided by:** user

- **Context:** The proof gate spec said "warn adds a message" and "block returns exit 2" without saying how Claude Code reads each. R2 found exit 1 is a hook error, `additionalContext` continues the turn, and a blocking hook can loop.
- **Decision:** Warn = exit 0 with JSON `{"systemMessage": "..."}`. Block = exit 2 with the message on stderr, only when `stop_hook_active` is false. Never exit 1.
- **Why:** `systemMessage` shows the user the gap without forcing more agent work, matching warn-by-default (Q11). Exit 2 is the documented block; checking `stop_hook_active` prevents loops.
- **Alternatives:** `hookSpecificOutput.additionalContext` for warn (continues the turn, so it acts like a soft block); `decision: "block"` JSON (same effect as exit 2, but exit 2 wins if both appear).
- **Impact:** Proof spec. Needs an observed test in follow-up bean `vantage-2vdj` before Phase 1 ships the gate.

### D61. Claude Code OpenTelemetry as an optional local source

- **Status:** accepted 2026-10-14 (was proposal P9).
- **Decided by:** user

- **Context:** Operations listed Claude Code's OTel export as "to be verified". R2 confirmed OTLP/HTTP JSON reaches a receiver on `127.0.0.1:4318`, with `session.id` and `prompt.id` on every record, and identity attributes (`user.email`, account ids) too.
- **Decision:** An opt-in local OTLP receiver adds token and cost, tool result and Claude Code hook timing data. It binds to `127.0.0.1`, drops identity attributes on ingest, and keeps Claude Code's default redaction. It is a supplement; hooks and transcripts stay the spine.
- **Why:** It gives cost and hook latency that hooks don't carry, at no polling cost. It is off by default in Claude Code and redacts commands and paths, so it can't replace hooks.
- **Alternatives:** Parse token usage from transcripts only (no hook timings); require OTel (extra setup for every user).
- **Impact:** Operations spec; `vantage init` writes user settings `env`; Code tab may need managed settings (Q29).

### D62. Svelte for the web UI

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Open question Q17 asked which UI framework to use; the UI must be fast, keyboard-first and built on theme tokens.
- **Decision:** Svelte (with Vite) for the local web UI.
- **Why:** Small bundles and fast updates suit a calm, always-open local page; components map cleanly to the dot alphabet and theme tokens.
- **Alternatives:** React (larger ecosystem, heavier); Solid (fast, smaller community); plain web components (more hand-written plumbing).
- **Impact:** Phase 1 scaffolds a Svelte app served by the daemon. Revisit if a needed component library exists only for React.

### D63. npm package for install

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Open question Q18 asked whether to ship an npm package or a single binary.
- **Decision:** Ship Vantage as an npm package, run with `npx vantage add` and installed globally on request.
- **Why:** Simplest for a personal tool on Node, matches the install-by-prompt flow (D52) and needs no build pipeline per OS.
- **Alternatives:** A single binary (no Node needed, but per-OS builds and signing).
- **Impact:** Requires Node 20+; release CI publishes to npm later. Revisit a binary if Vantage becomes a product (D18).

### D64. Oxc tools for lint and format

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The Phase 1 scaffold (bean `vantage-vnn4`) needs a linter and a formatter. The bean assumed ESLint.
- **Decision:** Use the Oxc family: Oxlint with type-aware rules (`--type-aware`) for lint, and Oxfmt for format. No ESLint or Prettier. `tsc --noEmit` stays the type check.
- **Why:** The user's choice. Both are Rust tools that run in milliseconds, which keeps local checks and CI fast. Type-aware linting is stable since July 2026 and covers 59 of typescript-eslint's 61 type-aware rules. Oxfmt passes Prettier's JS and TS conformance tests.
- **Alternatives:** ESLint with typescript-eslint and Prettier (mature, but much slower and more config); Biome (one tool, but a smaller type-aware rule set).
- **Impact:** Oxfmt is still beta (0.x), so pin exact versions and expect small format churn on upgrades. A Svelte rule or plugin that only exists for ESLint is not available; revisit if the UI needs one, or add ESLint for `.svelte` files only.

### D65. shadcn-svelte for UI components

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** D62 picked Svelte but no component library. The UI needs accessible, keyboard-first components that follow Vantage's theme tokens and dot alphabet.
- **Decision:** Use shadcn-svelte (components copied into the repo, built on Bits UI) with Tailwind CSS. Theme tokens become Tailwind CSS variables.
- **Why:** The user's choice. The code lives in the repo, so it can be restyled to look calm and custom; Bits UI provides keyboard and accessibility behavior; it has the largest Svelte community.
- **Alternatives:** Ark UI (strong accessibility and the same API across frameworks, but unstyled and a smaller Svelte community); Bits UI or Melt UI alone (more hand work); Skeleton or Flowbite Svelte (look generic, fight custom themes); daisyUI (CSS only, no behavior).
- **Impact:** Adds Tailwind to the stack and the scaffold. Copied components are ours to maintain; updates are pulled by hand. Revisit if Tailwind fights the theme tokens or the UI moves to React (D62).

### D66. pnpm workspaces on Node

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The Phase 1 scaffold has five packages (core, daemon, hooks, cli, ui) and needs a package manager. Bun was also raised, as package manager and runtime.
- **Decision:** pnpm workspaces for development, pinned with `packageManager`, exact versions and `minimumReleaseAge: 1440`. Node stays the runtime; users still install from npm (D63).
- **Why:** The user's choice. First-class workspaces and filters, strict dependencies (no undeclared imports), a shared store, install scripts blocked unless allowed, and a delay on brand-new releases as a supply-chain guard.
- **Alternatives:** npm workspaces (works, but flat `node_modules` hides missing dependencies and every install script runs); Bun (fastest installs and about 10 ms startup, but as runtime it conflicts with `npx` install (D63) and has more Windows edge cases).
- **Impact:** Contributors need pnpm (corepack). Revisit Bun for a compiled hook binary only if Node hooks miss the 100 ms budget.

### D67. Spool hook runs built JavaScript; native binary deferred

- **Status:** accepted 2026-10-14
- **Decided by:** user (merged PR #17)

- **Context:** The real hook command (`node src/bin.ts`) cold-started in a median 126 to 133 ms on the dev laptop (Windows 11, Node 24, 40 runs, interleaved). Node itself needs a median 82 ms (`node -e ''`) here, so the 100 ms budget (D21) leaves about 18 ms for everything else. About 45 ms of the overhead was Node stripping TypeScript types at start-up. Hooks are async (D59), so the agent is not blocked either way.
- **Decision:** Register `node <repo>/packages/hooks/dist/src/bin.js` (plain JavaScript built by `tsc -b`) instead of the `.ts` source. `pnpm test` builds first. A native binary is not adopted now; it is the recorded next step if the budget must hold strictly (new bean).
- **Why:** It is the only lever that needs no new toolchain or per-platform release: median 95 to 99 ms, p95 130 ms, a 30 to 35 ms cut. Node's own start-up is the floor, and only a non-Node binary gets clearly below 100 ms.
- **Alternatives:** A single hand-written CJS file (median 92 ms, p95 119 to 129 ms; 3 to 7 ms better, but needs a bundler or duplicated code). A Bun-compiled binary (median 114 to 117 ms; slower than built Node). `bun src/bin.ts` (224 ms). A Go binary spike (median 32 to 33 ms, p95 41 to 47 ms, 2 MB; the only option clearly under budget, but it adds a Go toolchain and per-OS builds, and conflicts with the npm install of D63).
- **Impact:** The hook command now needs a build before use (`tsc -b`, which `pnpm test` runs); the installer (`vantage-p9x2`) must register the `dist` path. The budget is met at the median only marginally and not at p95 on this machine. Revisit with a native binary if hook latency shows up as a real cost (Q28).

### D68. One Settings view for engines, budgets and data policy

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** The design chose no model and had no place to see or control one. Explain layer 4 (D46), the judgment layer (Q4) and embeddings (Q25) all depend on engine choices, and the company data policy (`vantage-h8fv`) is undecided. UX listed settings without model fields.
- **Decision:** Add a Settings tab on the Sources page, specified in [settings](specs/settings.md). It holds Engines (one row per AI-assisted job), Budgets (daily runs and fallback order) and a Data policy (a master switch for outside calls plus one switch per kind of content: code, transcripts, chat, tickets). Everything that leaves the machine defaults to off. Values live in `~/.vantage/config.toml`, edited through `GET` and `POST /api/settings`.
- **Why:** The user decides what may leave the machine, in one place, before any engine runs. It keeps D10 (scores in code) and the privacy rules visible instead of buried in specs, and it lets the open model choices (Q4, Q25) land as a setting later without a redesign.
- **Alternatives:** A config file only (works, but hides what is on and what is sent); a per-feature toggle on each page (scatters privacy controls); hard-coding Haiku or one vendor (breaks the official-CLI rule and the user-chosen order in D46).
- **Impact:** New spec and API rows, with links from UX, operations and the README. No code yet. Revisit when Q4 or Q25 is answered, when `vantage-h8fv` records the company policy (its answer may change the defaults), or if the file and the `settings` table in [data schema](specs/data-schema.md) must be reconciled.

### D69. Decisions have a status and an owner, and are frozen once accepted

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** `docs/DECISIONS.md` holds 68 decisions with five fields each, but no status, no owner and no protection against edits. The rule that an agent's proposal stays "Proposed" until the user confirms it was convention only, and a changed decision overwrote the old reasoning. Prosper's ADRs (status, owner-only acceptance, frozen accepted text, supersede by a new record) showed the pattern.
- **Decision:** Every decision records `Status` (`proposed`, `accepted`, `superseded`, `rejected`), `Decided by`, and `Superseded by` when superseded. Only the user accepts or rejects. An accepted decision's text is frozen and a change is a new decision that supersedes the old one. `tools/check_docs.py` checks the fields, that proposals sit under Proposed, that a superseded decision names an existing successor, and (in CI, against the base branch) that no accepted decision was edited or removed.
- **Why:** It makes the existing "only the user confirms" rule checkable, keeps the history of why we chose something true, and costs one line per decision. It stays in one file, so reading and linking are unchanged.
- **Alternatives:** One file per decision in `docs/adr/` with a numbered template, as Prosper does (cleaner diffs, but a migration of 68 entries and more ceremony; revisit if the file becomes hard to review); status only with no freeze (leaves the overwrite problem); keeping the convention without a check (already drifting).
- **Impact:** All 68 existing decisions are marked accepted by the user, as D67 and D68 are (their PRs were merged on the user's instruction). New decisions from agents need a `Status: proposed` line and a place under Proposed until accepted. `.agents/rules/docs-and-specs.md`, `AGENTS.md` and the `update-spec` skill name the new fields. Revisit if accepted decisions need small corrections often (the freeze would then need an erratum line) or if the single file outgrows review.

### D70. Shell writes count as edits only inside the repo

- **Status:** accepted 2026-10-14
- **Decided by:** user
- **Context:** About half of flagged shell `writes` only named log, output or data files, and some `sed -i` runs hit helper scripts outside the repo ([research](research/shell-edit-precision.md)). Counted as `file.edited`, they would move work items (Built, expired proof) on scratch output, against "cards move only on evidence".
- **Decision:** At ingest, classify each named write target against the session `cwd` (or `repoRoot` when known). Only targets inside the repo reach `file.edited`; outside targets are recorded on `command.ran.outsidePaths`. Opaque writes keep counting unless a known `repoRoot` shows the `cwd` is outside it (`opaqueOutsideRepo`). Matching is lexical, no symlink resolution. Unresolvable targets, a missing `cwd` and commands with `cd` count as before.
- **Why:** The `cwd` is known at ingest and later layers can't recover it. A payload field keeps every write on record and adds no event kind, so the stage machine and linker need no change to ignore scratch output.
- **Alternatives:** A new `file.written_outside` event kind (clearer, but changes the 38-kind catalog and every consumer); a flag on `file.edited` (consumers that count edits would have to remember to filter); a path-suffix deny list (`.log`, `.txt`; misses real scratch scripts and wrongly drops real `.txt` docs); resolving symlinks (needs filesystem access in a pure function).
- **Impact:** `file.edited` shrinks to in-repo work. New `outsidePaths` and `opaqueOutsideRepo` fields on `command.ran`. The daemon should pass the git root as `repoRoot` (follow-up bean), else a subdirectory session misclassifies `../sibling` writes as outside. Revisit if lexical matching misses symlinked repos in practice.

### D71. Phase 1 stage machine rules the specs left open

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** Implementing the stage machine (`vantage-lxud`) hit rules the lifecycle and proof specs leave open, and limits of what the hooks capture today. Hook events carry the command and a pass or fail flag (`ok`), but no output, no exit code and no file content.
- **Decision:**
  1. **A proof is a `command.ran` with a known `ok`** whose command matches a short allowlist: test runners (`vitest`, `jest`, `pytest`, `dotnet test`, `dbt test` or `build`, `go test`, `cargo test`, `npm test` and kin) or data tools (`duckdb`, `bq query`, `psql`, `sqlcmd`). `pnpm check` is not on it, because it can be lint only. Compound commands count when one segment matches.
  2. **Weak proof never counts and is recorded:** `|| true` or `; exit 0` (cannot fail), `--passWithNoTests`, a reported `result.run` of 0 or all skipped, and any check that ran before the item had a code change. Zero-test and all-skipped detection needs the output summary, which hooks do not capture yet; until they do, only an optional `result: {run, skipped}` on the event triggers it (follow-up bean).
  3. **The code fingerprint is a hash of the item's code-edit event ids** up to the check, because file content is not captured. Proof expires when a later linked code edit lands, and the stage drops from Proven to Built with that edit as evidence.
  4. **Documentation edits** (`.md`, `.mdx`, `.txt`, `.rst`) do not expire proof, and a docs-only item stays Built with proof status `not_required` (D53).
  5. **Built** is the first linked edit, or a linked commit when no edit event exists (work done outside the agent). A commit through the shell is not an edit, and a commit never expires proof.
  6. **L2** when the command names an edited file, or a test named after it (`billing.test.ts` for `billing.ts`, stems of 5 or more characters). L3 and L4 wait for behaviors and deploys.
  7. **Phase 1 flags:** `unproven_claim` (a `session.stopped` after the last code edit with no fresh proof), `thrashing` (D55, cleared by a later passing check) and `forgotten` (Asked or Built, idle more than 5 days). `collision` and `waiting_on_you` need other sources.
- **Why:** Every rule can be computed from events already captured, so a card never moves on an agent's say-so (D3), and each transition names its evidence (D45).
- **Alternatives:** Treat any exit 0 as proof (accepts `echo`); expire proof on docs edits (punishes README fixes after a test run); capture output now (bigger hook, deferred to a follow-up bean).
- **Impact:** Updates the [proof spec](specs/proof.md#freshness) and the [data schema](specs/data-schema.md). The Stop hook must emit `session.stopped` for `unproven_claim` to fire. Revisit once hooks record output summaries, and when R1 data shows how many real checks the allowlist misses.

### D72. Ship the spool hook as a Rust binary in per-OS npm packages, with a Node fallback

- **Status:** accepted 2026-10-14
- **Decided by:** user

- **Context:** D67 left the spool hook at a median 95 to 99 ms and p95 130 ms on built JS, over the 100 ms budget (D21) at p95, with Node's own start-up (82 ms) as the floor. Q28 asked whether a native binary is worth a toolchain and per-OS builds against the npm install of D63. Bean `vantage-xex6` measured Go and Rust next to the control ([research](research/native-hook-binary.md)).
- **Decision:** Build the hook in Rust and publish one npm package per OS and CPU (`optionalDependencies` with `os` and `cpu` fields), so `npx vantage add` (D63) still works. The installer (`vantage-p9x2`) registers the resolved binary path; when no native package resolves, it registers `node dist/src/bin.js` (D67). `vantage doctor` reports which one is registered. The daemon, CLI and everything else stay TypeScript on Node.
- **Why:** It is the only lever that clears p95: four runs gave a median 26 to 33 ms and p95 44 to 52 ms against 91 to 119 ms and 118 to 147 ms for built JS. Rust and Go were within noise of each other, but Rust is 0.16 MB against 2.14 MB, has no runtime, and Rust is already in the toolchain through Oxc (D64). The optional-package pattern keeps D63 and needs no download or signing at first run.
- **Alternatives:** Accept built JS (no new toolchain, but p95 stays 118 to 147 ms and the sync `Stop` gate has no headroom). Go (same speed, 13 times larger, a second toolchain beside Oxc). Download on first run (needs hosted releases, checksums, and a mark that makes SmartScreen apply). Build from source (needs a toolchain on every user's machine). A Bun-compiled binary (114 to 117 ms in D67, slower than built Node).
- **Impact:** Adds a Rust crate (about 60 lines), release CI that builds 5 targets, and 5 small npm packages; `vantage-p9x2` gains path resolution and the fallback. A parity test must assert the same line as `collect.ts` and exit 0 with the daemon down. Windows antivirus behavior of an unsigned binary is untested and must be checked before release; revisit signing if it is flagged. Revisit the whole decision if hook latency never shows up as a real cost, since hooks are async (D59). Not implemented: needs the user's confirmation first.

### D73. How the Phase 1 Stop gate reads state and takes its mode

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and D53, D59, D60, D67)
- **Context:** Building the gate (`vantage-8nb2`) and `session.stopped` capture (`vantage-cji5`) hit choices D53, D59 and D60 leave open. The Stop hook is the only synchronous hook and has no latency headroom (D59, D67). The daemon derives item state on a 30 second pass, so the state a Stop hook reads can lag the last few edits. Config is `~/.vantage/config.toml` (*tentative*), and a TOML parser would add a dependency to the hot path.
- **Decision:**
  1. **One command for Stop.** It appends `session.stopped` to the spool like every hook, then runs the gate. `Stop` is registered without `async`; the other seven events stay async.
  2. **The gate reads the derived tables read-only** (`work_items` joined to the session's linked events, plus the session's `file.edited` events for file names). It does not replay the spool or run the stage machine. Any failure, a missing store or an unknown session is silence with exit 0.
  3. **It warns for a session** that has a code edit (not only `.md`, `.mdx`, `.txt`, `.rst`, D53) and a linked item past Asked whose proof status is `none`, `expired`, `failed` or `weak`. Unknown edit paths count as code, as in the stage machine.
  4. **`stop_hook_active: true` is always silent**, in every mode, so a Stop that follows a Stop hook never gets a second message.
  5. **Mode** is `VANTAGE_GATE_MODE`, else a `proof_gate = "off|warn|block"` line in `config.toml`, else `warn`. Unknown values mean `warn`. `block` is parsed and reaches the decision but renders as warn (exit 0): exit 2 is not wired until Q11 is answered.
- **Why:** Reading tables keeps the hook near the Node start-up floor (about 85 ms median locally, ruled by D67), at the cost of up to one 30 second pass of lag (see Impact). A line match avoids a TOML dependency in the hot path. Silence on any doubt matches D3 and the rule that the gate must never teach users to ignore it (D53).
- **Alternatives:** Replay the spool inside the hook (always fresh, but needs the stage machine and linker in a 100 ms budget); ask the daemon over HTTP (a second moving part, and a down daemon would need a timeout); a full TOML parser (no dependency headroom); wiring exit 2 now (policy is Q11).
- **Impact:** Updates the [proof spec](specs/proof.md#the-gate), [ingestion](specs/ingestion.md) and [operations](specs/operations.md). A check run in the last 30 seconds before the Stop may not be seen yet, which produces a false warning; the Stop event also raises `unproven_claim` only after the daemon's next pass. Revisit if false warnings from that lag show up in use (a "run a pass now" call from the hook would fix it), or when block mode is wired.

### D74. Status line reads a daemon-written summary file; Phase 1 glyph and fallback rules

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** The status line must be fast, must never break a session, and must work with the daemon down. The spec fixes the glyphs and layout but leaves open how a session finds its item, what the line shows with no data, what counts as "needs you" in Phase 1, and how the six-step track maps onto the three stages that exist.
- **Decision:** The daemon rewrites `~/.vantage/status.json` after every stage pass, and the command reads only that file (no SQLite, no network). The file maps each session active in the last 7 days to the linked item with its latest event. `needsYou` counts items with any open, undismissed flag. The track shows `●◉○○○○` (Asked), `●●◐○○○` (Built without fresh proof), `●●●¹○○○` or `●●●²○○○` (Proven), `●●◌○○○` (docs only), and an item with an open flag shows `◍!` on its current step. No file or an unreadable one prints `vantage · offline`, a file older than 5 minutes prints `vantage · stale`, and the command always exits 0. The command imports `@vantage/core/status-line`, a subpath export, so start-up stays near bare node.
- **Why:** A file read keeps the line independent of the daemon and its database lock, and meets the 100 ms budget. Counting any flag as needs-you matches the spec's single count and the three Phase 1 flags all want the user's attention. Distinct `offline` and `stale` lines tell the user whether the daemon never ran or stopped.
- **Alternatives:** Query SQLite from the command (slow start-up, lock contention, fails with the daemon mid-write); call the daemon over a socket (blocks when it is down); count only `unproven_claim` and `thrashing` as needs-you (hides forgotten work, which the user should see); show nothing when the daemon is down (looks like Vantage is not installed).
- **Impact:** Adds `status.json` as a derived file (safe to delete). The running daemon must start the stage loop with `statusFile` (follow-up bean). `docs/specs/status-line.md` records the mapping and install snippet. Revisit when Reviewed, Shipped and Verified exist (the track grows), when pings have a source, or if 30 s staleness feels slow.

### D75. Phase 1 Track page and local server rules the specs left open

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** Building the Track page (`vantage-olgf`) hit choices that D32, the web-ui spec and the architecture doc leave open: where the token lives, which requests need it, what "stale" and the attention groups mean with only Claude Code and git as sources, and how the page refreshes.
- **Decision:**
  1. **Token storage:** a 256-bit random token in a user-only file (`~/.vantage/token`, mode 0600 on POSIX), created on first start. The OS credential store (architecture doc) waits for the install bean. The UI receives it in the URL fragment, moves it to `sessionStorage`, removes it from the address bar and sends it only as `Authorization: Bearer`. Query strings are never read.
  2. **What needs the token:** every `/api/*` call. The static UI shell holds no data and is served without it, but still behind the Host check, with a strict Content-Security-Policy.
  3. **Check order:** method (GET and HEAD only, else 405), `Host` must be `127.0.0.1:<port>` or `localhost:<port>` (403), `Origin` when present must be `http://` plus one of those (403), then the token (401). No CORS headers are ever sent. A dev server on another port must be named explicitly in `extraHosts`.
  4. **Attention groups in Phase 1:** *Needs you* is any item with an open, undismissed flag; *In progress* is everything else not verified; *Waiting on others* and *Done this week* stay empty until GitHub and deploy sources exist, and an empty group is not shown.
  5. **Stale:** the Track response is stale when the last stage pass (`max(work_items.updated_at)`) is older than 5 minutes, meaning the rows may lag the evidence. Source silence alone is not stale, because an idle laptop produces no events. Sources with no events at all, and stages no configured source can evidence (Reviewed, Shipped, Verified, and Proven for docs-only items), are shown hollow, never green.
  6. **Refresh:** the page polls `GET /api/track` every 5 seconds. The WebSocket `GET /api/live` arrives in a follow-up bean; polling is within what the 30-second stage pass can deliver anyway.
- **Why:** Each rule follows from D32 and D3 (status only from evidence) using only data that exists today, and each is cheap to replace when a richer source lands.
- **Alternatives:** OS credential store now (platform code and a native dependency for no Phase 1 gain); token on the static shell too (breaks the fragment hand-off, protects only public code); mark a source stale after N quiet minutes (false alarms when idle); WebSocket first (more moving parts than a 30-second pass justifies).
- **Impact:** Updates the [web UI spec](specs/web-ui.md) API table and the architecture doc's token line. Revisit the token file once `vantage init` can write to the OS credential store, and the stale rule once GitHub or CI sources report their own sync times.

### D77. Capture accuracy: repo root from scanned worktrees, test counts from runner summaries

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** D70 left `repoRoot` unset, so a session started in a subdirectory lost real edits to sibling paths (`vantage-1ulu`). D71 left output capture open, so a run that executed zero tests could still count as proof (`vantage-ci4u`). The hook only appends the raw payload to the spool (D67, D72), so any parsing happens in the daemon.
- **Decision:**
  1. **Repo root:** at ingest, `repoRoot` is the longest worktree path from stored `worktree.scanned` events that lexically contains the session `cwd`. No match keeps today's reading (`cwd` is the root). No `git` call runs in the hook or in ingest.
  2. **Test counts:** from the spooled `tool_response` (or a transcript `tool_result`) the daemon parses the summary of vitest, jest, pytest, `go test` and `dotnet test` into `command.ran.result {run, passed, failed, skipped}` with `run` = passed + failed + skipped and errors counted as failed. Only numbers are stored. Output with no recognised summary leaves `result` absent. `go test` without `-v` reports counts only when every package says it has no tests; a plain `ok` is left unrecognised.
- **Why:** Worktree roots are already collected by the scanner, so a lexical lookup is free and keeps the hook inside its budget. Parsing the runner's own summary is evidence, not an agent claim (D3), and storing numbers keeps output text out of the store (privacy boundary).
- **Alternatives:** Run `git rev-parse --show-toplevel` per session (a process spawn per event, and wrong for deleted worktrees); walk up looking for `.git` (filesystem access in ingest, and still misses repos the user never registered); parse output in the hook (breaks the 100 ms budget); store a capped output excerpt (privacy risk, no extra evidence); count `go test` packages as tests (invents counts).
- **Impact:** Updates the [ingestion spec](specs/ingestion.md). An event ingested before the scanner reports its worktree keeps the cwd-based classification, since events are immutable. A missed or novel runner format stays "unknown", never zero. Revisit if repos outside the scanner's registered set matter, or when another runner (dbt, cargo, mvn) is needed.

### D78. Phase 1 daemon runtime: one process, lock and health files, `vantage start` and `vantage open`

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** Beans `vantage-6bni` and `vantage-v3sw` needed a long-running process. The specs say "one daemon" and "a single instance per machine" but not how the instance is detected, how the CLI finds it, which port it uses, or how `repos` are configured.
- **Decision:**
  1. **One process** (`vantage start`) runs spool ingest and transcript backfill every 5 s, the git scan loop (only when repos are configured), the stage loop with `statusFile = $VANTAGE_HOME/status.json`, and the HTTP server on `127.0.0.1`. SIGINT and SIGTERM stop the loops, finish the in-flight tick, close the server and the store, and release the lock.
  2. **Single instance:** an exclusive `daemon.lock` file holding the pid, taken before the store is opened. A lock whose process is gone, or whose `health.json` has not been refreshed for 60 s, is taken over. A second start prints that Vantage is running and exits 1 without touching any other file.
  3. **Health:** `health.json` in the home directory (pid, port, state, last ingest and stage pass, error count, repo count; never error text or content), rewritten every 10 s and on stop. `vantage open` and the later `vantage doctor` read it, so no token is needed.
  4. **Port:** default 4317, from `--port` or `VANTAGE_PORT`; a busy port is an error, not a silent fallback, so bookmarks stay valid.
  5. **Repos:** `VANTAGE_REPOS` (path-delimited) wins, else `repos = ["..."]` in `config.toml`; no config means no repos. `VANTAGE_PROJECTS_DIR` overrides the transcript directory (tests and non-default installs).
  6. **`vantage open`** prints `http://127.0.0.1:<port>/#token=<token>` and opens it with the platform opener; `--print` only prints. It refuses when no daemon is running. The token stays in the fragment (D75).
  7. **Logs** are one plain line per event with counts only, never transcript text, paths or commands.
- **Why:** Evidence for every status the Track page and status line show comes from this one process; the lock, health file and fixed port are the smallest mechanisms that make "already running", "open it" and "is it healthy" answerable without talking to the server.
- **Alternatives:** An OS service or Task Scheduler entry now (installer scope, `vantage-p9x2`); a named pipe or HTTP call for the instance check (needs the token or a second endpoint); a random port per start (breaks bookmarks and the fragment URL habit); a TOML parser dependency for `repos` (headroom, and one list is enough for Phase 1).
- **Impact:** Updates [operations](specs/operations.md#daemon-lifecycle). The installer registers the start at login and writes `config.toml`. Revisit the 60 s takeover and the 5 s ingest cadence after a week of daily use, and the single-process model if ingest blocks the HTTP server (backfill is synchronous).

### D79. How `vantage add` edits machine settings: marker, manifest, backup, opt-in git hooks

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** `vantage add` (D50, D52) edits files that are not Vantage's: the user's Claude Code `settings.json`, `config.toml` and, in D50, the global git config. The specs promise `--dry-run`, chaining, idempotency and an exact `remove`, but not how entries are recognised, what is backed up, or what happens when Husky sets a repo-local `core.hooksPath` (git then ignores a global one). The git scanner already reads every registered repo by polling (D78), and no consumer reads a hook-written git event yet.
- **Decision:**
  1. **Marker:** every command Vantage registers ends in `--vantage-managed` (hooks and status line). `remove`, `uninstall` and `doctor` act only on entries carrying it; the binary ignores the argument. `install.json` in the Vantage home records what `add` did.
  2. **Safety:** `add` shows the plan, asks for confirmation (or `--yes`; with no terminal and no `--yes` it refuses), copies an existing `settings.json` to `<home>/backups/` before the first edit, makes no backup and no write when nothing changes, refuses unreadable JSON, and never replaces someone else's `statusLine` or `core.hooksPath`. Paths come from `HOME`, `USERPROFILE`, `VANTAGE_HOME`, `CLAUDE_CONFIG_DIR` and `GIT_CONFIG_GLOBAL`, so tests and trial runs never touch the real ones.
  3. **Git hooks are opt-in** (`--git-hooks`), not default. They are wrapper scripts in `<home>/git-hooks` plus a global `core.hooksPath`; each wrapper runs the repo's own hook after Vantage's (`git rev-parse --git-path`), which covers plain `.git/hooks` and Lefthook's shims. A repo-local `core.hooksPath` (Husky) bypasses a global one, so Husky is detected and reported, not chained. `uninstall` unsets the path only if it is still Vantage's and deletes only marked wrappers.
  4. **Uninstall strips, it does not restore a copy,** so edits made after `add` survive; the backup stays for manual restore. `<home>` data is never deleted.
  5. **`vantage doctor`** fails only on what breaks capture (hooks missing or pointing at a missing file, spool not writable, database cannot open read-only, unreadable settings). A daemon not running, a stale health or status file, no repos and a missing status line are warnings, because hooks still write to the spool.
  6. **One function resolves the hook command** (`resolveHookCommands`), so the native binary and its fallback (D72) change one place.
- **Why:** A marker makes removal exact without a second source of truth that can drift, and works in any shell. Opt-in git hooks avoid a machine-wide change that has no reader today and that Husky repos bypass anyway. Warn-versus-fail follows what a user must fix now.
- **Alternatives:** Match by command path instead of a marker (breaks when the install moves); a `_vantage` key inside hook objects (Claude Code may reject unknown keys); git hooks on by default (global change, no consumer); restore the backup on uninstall (drops later edits); wrap Husky by editing `.husky/` (changes the repo, against D50).
- **Impact:** Updates [first-run](specs/first-run.md), [operations](specs/operations.md), [status line](specs/status-line.md) and the [install guide](install-for-agents.md). The `--vantage-managed` marker becomes part of the contract with every future hook command, including the native one. Revisit git hooks when a source reads hook-written git events, and the doctor policy after real installs.

### D76. The native hook hands Stop to the Node entry and spools every other event itself

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** D72 ships the spool hook as a Rust binary, and D73 made `Stop` synchronous: the same command spools `session.stopped`, then runs the proof gate, which is Node code reading the SQLite store. The specs don't say how a native binary covers `Stop`.
- **Decision:** The binary appends the spool line itself for every event except `Stop`. For `Stop`, when its first non-flag argument names an existing Node entry (flags such as the installer's `--vantage-managed` marker are skipped) (`dist/src/bin.js`), it passes the untouched payload to `node <entry>` and exits 0 after it returns; that entry spools the line and runs the gate, so the gate stays in one place and the line is written once. Without the argument, or when `node` can't start, `Stop` is spooled natively and the gate is skipped, which fails open like D73's silence when the daemon is down. The installer registers `<binary> <absolute path to dist/src/bin.js>`. The binary reads no SQLite.
- **Why:** It keeps one implementation of the gate (D73) and keeps seven of eight events at the native cost: median 29 ms, p95 36 ms, 40 runs interleaved after 3 warm-ups, against 101 and 134 ms for `node dist/src/bin.js`. `Stop` runs once per agent turn and already needs Node, so it pays Node's start-up either way: 123 ms median and 148 ms p95 through the binary, against 103 and 130 ms for Node alone.
- **Alternatives:** The gate in Rust (a second copy of the D73 logic and a SQLite dependency in a 0.25 MB binary). Spool natively, then start Node only for the gate (needs a flag so Node doesn't spool again, and two processes for the same event). Run the gate in the background (breaks the synchronous answer D73 needs).
- **Impact:** `Stop` costs about 20 ms more than Node alone, and the binary spawns `node`, so a machine without Node on `PATH` loses the gate but keeps the spool. The install bean (`vantage-p9x2`) registers the two-argument command and `vantage doctor` reports it. Revisit if the gate moves out of Node or if `Stop` latency shows up as a real cost.

### D80. The installer picks the native hook by lookup, in a fixed order, and doctor nudges when it is unused

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** D72 and D76 ship a native spool hook as per-OS npm packages, but nothing registers it. The packages are not published yet, and developers build the crate locally. `vantage add` must choose a hook without a network call or a build step, and must not leave a slower Node hook in place once the native one exists.
- **Decision:** `resolveHookCommands` (the single place that decides) picks, in order: (1) the `@vantage/hook-<os>-<cpu>` package binary when it resolves, (2) a binary built in this checkout at `packages/hooks-native/target/release/vantage-hook` (`.exe` on Windows), (3) `node <packages/hooks/dist/src/bin.js>`. A native choice registers `"<binary>" "<node entry>" --vantage-managed` (D76), the status line stays on Node. `vantage add --dry-run` prints the choice and why. `vantage doctor` reports native or node, fails when the binary or the Node entry is missing, and warns (never fails) when the Node hook is registered while a native binary is available, with the fix `vantage add --yes`. Re-running `add` updates the managed entries in place.
- **Why:** A plain lookup keeps `add` offline and fast, and works before the packages are published. Putting the local build second lets a developer get the 29 ms hook today. A warning, not a failure, because the Node hook still works, only slower (p95 about 130 ms against the 100 ms budget).
- **Alternatives:** Registering native only when a package resolves (leaves developers on the slow hook until publish). Building the crate from `vantage add` (needs a toolchain, slow, surprising). Failing doctor on the Node hook (breaks machines with no native build).
- **Impact:** `packages/cli` only. A moved or deleted local build breaks the registered hook, so doctor fails on a missing binary and `vantage add --yes` repairs it. Revisit when the packages are published, since the local build then rarely matters.

### D81. Live updates: `GET /api/live` with the token in the subprotocol and a dependency-free send-only socket

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** D75 has the Track page poll every 5 s; the web-ui spec wants `GET /api/live` to push `item.changed`, `flag.raised` and `source.health` within 2 s. A browser `WebSocket` cannot set an `Authorization` header, D75 forbids the token in a query string, and the socket is a new way into agent work on localhost, so every D32 check must apply to it too. The repo's supply-chain rules (D66) favour few dependencies.
- **Decision:**
  1. **Checks before the 101, in the order of every other route:** method `GET` (405), `Host` exact match (403), `Origin` when present (403), token (401), then path (404), handshake shape (400) and a cap of 8 connections (503). A failed check gets a plain HTTP status and no upgrade.
  2. **Token:** the page opens `new WebSocket(url, ["vantage.v1", <token>])`. The token travels in `Sec-WebSocket-Protocol` next to the fixed name `vantage.v1`; the server compares it in constant time and echoes only `vantage.v1`, never the token. Never in the URL.
  3. **Implementation:** about 150 lines on Node's `upgrade` event, no package. The socket is send-only: text frames out; the client may send only ping, pong and close, masked and at most 125 bytes. Anything else closes it (1008, or 1002 for an unmasked frame).
  4. **Pushes:** after each stage pass the daemon diffs the Track view against the last one and sends `item.changed` (id plus the changed fields; every field for a new item), `flag.raised` (item id, kind, severity), `source.health` and `resync` (an item vanished; refetch). Every message carries `at` and `lastPassAt`. Nothing carries transcript text, commands or paths; item titles and flag reasons appear only inside `item.changed`, as they already do in `/api/track`.
  5. **Liveness:** the server pings every 15 s and drops a client that missed one; a send buffer over 1 MB drops the client.
  6. **Page:** it opens the socket, refetches `/api/track` on every connect, applies pushes, and polls every 5 s only while the socket is down; it reconnects with backoff from 1 s doubling to 30 s.
- **Why:** The subprotocol header is the only place a browser socket can carry a secret outside the URL, and it keeps every rejection a normal HTTP status before any socket exists. A send-only socket needs no extensions, fragmentation or compression, so hand-written framing stays small and testable, with no new dependency to pin and audit. Diffing after the pass keeps the stage machine free of push logic and sends the minimum.
- **Alternatives:** Token in a first message after connect (the socket exists before authentication, so a failed token cannot be a status code and an unauthenticated peer holds a connection slot). Token in the query string (breaks D75, lands in logs and history). The `ws` package, exact-pinned (well known, but about 60 KB of code and a new supply-chain entry for a feature that needs a tenth of it). Server-sent events (no header problem, but a fetch-based stream would need its own framing and the spec names a WebSocket).
- **Impact:** Adds `packages/daemon/src/live.ts`, an `upgrade` handler in `http.ts`, an `onPass` hook on the stage loop and `packages/ui/src/lib/live.ts`. Updates the web-ui spec and ROADMAP. The token appears in a request header on the upgrade, as it does on every other route. Revisit if the daemon needs client messages (write actions, Phase 2) or if hand-written framing needs extensions such as compression.

### D82. UI component tests: Vitest project with happy-dom and Svelte's own `mount`

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** The Track page (Svelte 5, D62) was verified only by `svelte-check` and a manual browser run, which breaks the evidence-over-claims rule. The specs name Vitest (testing rules) but leave open how components are rendered and in which DOM.
- **Decision:** Component tests live in `packages/ui/test/` as a second Vitest project (`packages/ui/vitest.config.ts`, listed in the root config's `projects`), run by `pnpm test`. They use `happy-dom` (exact-pinned 21.0.1, published more than a day before install per D66) and Svelte's own `mount`, `flushSync` and `unmount`, with a faked `fetch` and synthetic data. The project resolves Svelte's `browser` condition; the Node project keeps its settings and excludes `packages/ui`.
- **Why:** It adds one dev dependency and no wrapper library, runs on ubuntu and windows with no extra step, and keeps the Node packages off the browser build of Svelte.
- **Alternatives:** `jsdom` (heavier, slower to start, same coverage here). `@testing-library/svelte` (two more dependencies for queries that `querySelector` already covers in a page this small). Playwright component tests or end-to-end runs (a browser download in CI; out of scope for this bean).
- **Impact:** `pnpm test` also runs the UI tests. Browser-only behaviour that happy-dom lacks (layout, real focus rings) is not covered and would need a browser test. Revisit if the UI grows past what `querySelector` assertions keep readable.

### D83. Plugin commands are `/vantage:<command>`; `add --yes` is never pre-approved

- **Status:** accepted 2026-10-14
- **Decided by:** user (delegated to the parent session on 2026-10-14; checked against measured data and the standards: consistent with earlier decisions, alternatives recorded, reversible, nothing leaves the machine)
- **Context:** The first-run spec planned `/vantage add`. Claude Code documents plugin commands as `/<plugin>:<command>` and describes no plugin form that takes `open` as an argument. The plugin must wrap the CLI without widening what `add` may do (D79).
- **Decision:** The `vantage` plugin ships `commands/{open,start,doctor,status,add}.md`, invoked as `/vantage:open` and so on. Each has `disable-model-invocation: true` and an `allowed-tools` list naming only the read-only lookups and its own CLI call; unrestricted Bash, `uninstall` and `remove` never appear (`tools/plugin_check.py`, run by `tools/check_docs.py`). `add` pre-approves only `--dry-run`; `--yes` runs after an explicit yes in chat and stays behind Claude Code's own permission prompt. `status` reads `status.json` and makes no server call. The CLI is found through `PATH`, then `VANTAGE_CLI`, then the checkout named by `install.json`.
- **Why:** The namespaced form is the documented one; a gate on `--yes` keeps the confirmation in the user's hands even if the agent misreads a reply; reading the status file adds no server feature.
- **Alternatives:** A skill named `vantage` taking an argument (a bare `/vantage open` is undocumented for plugins, unverified); `/vantage:add` pre-approving `--yes` (one prompt less, no second gate); `status` calling the API with the token (needs the token in the agent's context).
- **Impact:** First-run spec and README say `/vantage:add`. Commands live under `commands/`, which the docs call legacy next to `skills/`; revisit if `commands/` is removed. Live runs in a real session are still to do.

### D90. Issues live in the user's tracker; Vantage only syncs them

- **Status:** accepted 2026-10-14
- **Decided by:** user (said in chat on 2026-10-14: every session should have an issue, and Vantage should only sync, not be an issue manager)

- **Context:** After the first real run the Track page showed hundreds of `Session <id>` items because most sessions run on the default branch with no ticket in the branch name, so the linker (D25) falls to one provisional item per session. The user asked that every session be tied to an issue and considered either requiring an issue manager or building an internal one.
- **Decision:** Vantage does not build an issue manager. The issue of record lives in the user's tracker (Jira, Linear or GitHub Issues, whichever the user chooses in configuration; the first one to build is a separate choice). Vantage syncs it: read first (title, link, status, assignee, priority), write-back only on an explicit user action (PRD non-goals). An issue key found in a branch name, a worktree or a session's first request anchors the session to that item (D25 rule 1) and the item takes its title and link from the tracker. A session with no issue stays a provisional item and is counted. A new setting `issue_policy` (`off`, `suggest` default, `require`) says what Vantage does about sessions with code edits and no issue: `suggest` shows how many there are and nudges at session start; `require` also warns from the Stop gate (warn only, never blocking in this phase), following D53 (sessions without code edits are exempt).
- **Why:** The work item already plays the role of the issue (title, stages, proof, flags), so a second internal tracker would duplicate it and create one more list to keep. A synced tracker gives real titles and links, matches what the user's team already uses, and keeps the PRD scope. A soft policy fixes the root cause (sessions without an anchor) without creating friction for exploratory conversations.
- **Alternatives:** A full internal issue manager with its own ids (a second source of truth and more to maintain; the item already covers it); requiring a tracker before anything works (blocks first use, and a personal repo may have none); a blocking gate (breaks flow, teaches workarounds such as placeholder titles); doing nothing (the page stays unreadable).
- **Impact:** Adds work for a tracker adapter (Phase 6, `vantage-vncu` research) and credential storage (`vantage-5fek`), and for the `issue_policy` setting and the "sessions without an issue" count in the page and in `vantage stats`. No code changes in this record. Until a tracker is connected, the soft titles from the first request and the lineage grouping (parallel work) carry the load. Revisit if the chosen tracker cannot be read with a user-scoped token, or if the week of use shows few sessions without an issue.

---

## Proposed (pending confirmation)

### D96. The agent's task list and sub-agent runs become events; only counts and one short current-task line are kept

- **Status:** proposed
- **Context:** Claude Code already records the agent's own task list (`TodoWrite`) and sub-agent runs. Measured over 14 days on one machine ([research](research/session-lineage.md)): `TodoWrite` in 0 of 521 sessions, the newer task tools in 3, and 730 sub-agent runs in 119 sessions, mostly async with no totals in the result. The card should show progress and activity from this, and a todo text can hold private detail.
- **Decision:** Two event kinds. `task.list.updated` (from `TodoWrite`) keeps `total`, `pending`, `inProgress`, `completed` and, when text capture is on, `current`: the first `in_progress` item, stripped of URLs, paths, emails and secret-looking tokens, one line, at most 80 characters. No other todo text is stored. `subagent.run` is one slice per sub-agent file and batch (`agentId`, `startedAt`, `endedAt`, `tools`), summed per agent by the read model. Text capture uses the `item_titles_from_requests` switch (default on, local only). Items read `tasksTotal`, `tasksDone`, `currentTask`, `subagentRuns` and `subagentTools` from the `item_tasks` and `item_sessions` views (migration 9). `TaskCreate` and `TaskUpdate` are not read until the task id in the create result is verified.
- **Why:** Counts carry the progress signal without the private text; the one line the card needs is short, cleaned and switchable. Slices make a run that is read in several batches additive without rewriting events.
- **Alternatives:** Store the whole list (private text, no gain for the card). Take run totals from the tool result (688 of 730 runs are async and have none). Count only (no way to show what is being done now).
- **Impact:** Two event kinds (catalog 39 to 41), migration 9, specs [ingestion](specs/ingestion.md), [work item model](specs/work-item-model.md) and [data schema](specs/data-schema.md). `store.captureTaskText` is the switch, set at daemon start from `item_titles_from_requests` (D95). Revisit if the task tools replace `TodoWrite` for most users.

### D97. A fork or a resume is named only by the hook source; timing is a hint

- **Status:** proposed
- **Context:** 79 of 521 sessions are derived. 59 of the 75 whose parent transcript is in the window started while the parent was still producing lines, but the hook source (`fork`, `resume`, `clear`, `compact`) that names the kind is not in the data yet.
- **Decision:** The lineage kind stays `continuation` unless a `SessionStart` source says `fork` or `resume`. `forkCount` and `resumeCount` count those only. `forkHintCount` counts derived sessions whose parent kept producing events after the child started and is shown as a hint, never used to set the kind or to group.
- **Why:** The same timing fits a fork and a second resume of one parent, so it cannot name either with certainty; an explicit source can.
- **Alternatives:** Call the overlap a fork (79% of derived sessions, unverified). Drop the hint (loses a cheap signal that the parent went on).
- **Impact:** Counts read 0 until hooks have recorded sources. Revisit once a week of hook data shows how the hint compares with the explicit sources.

### D92. Tool events take the branch from the transcript line; stored events get it beside them

- **Status:** proposed
- **Context:** Measured on the live store: 125 of 137 sessions with edits had every edit in a per-session item, because transcript `file.edited` and `command.ran` events carried no branch and the linker found one only through a scanned worktree, although the transcript line names it (`gitBranch`, 506 of 518 sessions on a non-default branch). D54 already says events link by the branch at event time.
- **Decision:** Transcript tool events carry `payload.branch`: the line's own `gitBranch`, else the nearest earlier line of the same session; a detached `HEAD` or no field means no branch. Events already stored, and calls a hook stored first, keep their payload (events are immutable, see the data schema rules): the branch is recorded beside them in `event_branches` (migration 6), `loadEvents` fills `payload.branch` from it when absent, and a one-shot backfill re-reads the transcripts inside the 14-day window. The linker needs no new rule: D25 rules 1 and 2 already read `payload.branch`.
- **Why:** It uses a field the data carries and D54 already prescribes, with no heuristic. A side table is smaller and safer than rewriting events or re-ingesting: the hook and the transcript race for the same tool id, and only a side table lets the later reader add the branch.
- **Alternatives:** Rewrite stored payloads (breaks immutability, and a replay would disagree). Delete the window's events and re-ingest (loses links and undo tombstones tied to event ids). Resolve the branch at link time from `cwd` and the git scanner only (the status quo, which missed most sessions).
- **Impact:** Migration 6, `backfillEventBranches`, ingest and `loadEvents` change, specs [ingestion](specs/ingestion.md) and [work item model](specs/work-item-model.md). On the live store: sessions with an anchored edit 12 to 129 of 137, `Session` items 130 to 33 ([measurements](research/session-lineage.md)). Caveats: with no repo option set, a branch item key is `branch::<branch>`, so the same branch name in two repos shares one item; calls whose transcript is older than the window keep no branch. Revisit if the transcript `gitBranch` proves wrong for a class of sessions (for example a session started before a `git switch` inside a sub-shell).
### D86. Derived sessions join their parent's item, from explicit signals only

- **Status:** proposed
- **Context:** On the first real run the Track page listed hundreds of untitled `Session <id>` rows, because D25 rule 4 makes one provisional item per session with edits. Measured over 14 days ([session lineage](research/session-lineage.md)): 79 of 519 sessions (15%) copy their parent's history into a new session file, and sub-agent runs carry the parent's session id. No hook payload or transcript field names a parent directly.
- **Decision:** The transcript backfill emits a `session.derived` event (`parentSessionId`, `lineage`) when a session file starts with another session's lines. The linker keeps anchors first (D25, D54). An event with no anchor of its own joins the anchored item its family (the root session and everything derived from it) mostly landed on, else `session:<root>`. Sub-agent runs stay inside the parent's session; `agentId` is kept on events. Compaction is not a lineage (the session id never changed in 129 of 129 boundaries). The kind is `resume` or `fork` when `SessionStart` says so, else `continuation`. Per-item `session_count`, `derived_count` and `subagent_count` come from the `item_sessions` view (migration 4).
- **Why:** The only signals used are ones the data carries, so a card still moves on evidence and not on a guess. Each link stays on its event, so the existing undo works unchanged.
- **Alternatives:** One item per session (status quo; it fragments work, and D25 lists it as a loser). Grouping by cwd and branch within a gap (D87). Reading the parent from a hook (no hook carries one).
- **Impact:** New event kind `session.derived` (catalog 38 to 39), linker rule `derived-session`, migration 4, specs [work item model](specs/work-item-model.md) and [ingestion](specs/ingestion.md). Revisit when a hook or transcript field names the parent, or when a labelled set shows the copied-history signal groups unrelated sessions.

### D87. Heuristic grouping by cwd, branch and time gap is not a rule

- **Status:** proposed
- **Context:** After the explicit signals (D86), some sessions may still be one piece of work: same cwd and branch, starting soon after another ended.
- **Decision:** Do not build it yet. Measured over 14 days: of 519 sessions, 87 (16.8%) start within 5 or 30 minutes of the previous session on the same cwd and branch (89 at 120 minutes). 68 of them are already derived by a signal; 19 (3.7%) would be grouped by the heuristic alone, and 80 of the 87 sit on non-default branches where the branch anchor already groups them. Revisit if the user confirms a labelled sample of the 19.
- **Why:** The gain is small (3.7% of sessions) and its precision is unmeasured, while a wrong merge hides work. D25 makes merging a user action when no anchor agrees.
- **Alternatives:** Build it as an inferred link shown as "suggested" (the inferred-link path is in the spec but not built, Q25); build it as a deterministic rule (rejected: it is not one).
- **Impact:** None until accepted. If accepted: an `inferred` link method with a visible suggestion, and a labelled set to track its precision.

### D84. Urgent flags only for recent activity, and a query API for the Track page

- **Status:** proposed
- **Context:** The first real run showed "Needs you · 300", all with `thrashing`, almost all from the 14-day transcript backfill, next to 300 untitled `Session <id>` rows with no filtering, sorting or paging. D55 (thrashing) and D71 (stage machine, `unproven_claim`) raise a flag whenever the evidence shows the pattern, however old. A pattern from last month is history, not something that needs the user this morning. D75 fixed the server rules and the single `GET /api/track` shape; both are accepted and frozen, so this adds to them instead of editing them.
- **Decision:**
  1. **Flag window:** `thrashing` and `unproven_claim` are raised only when the item's last activity is within `flag_window_hours` of now (default 48; `flagWindowHours` in `StageOptions`; `flag_window_hours = N` in `config.toml`, a whole number from 1 to 8760). Older items keep their stage, proofs and history and carry no urgent flag. `forgotten` is unchanged. Without a clock the window cannot apply and flags behave as before (pure-function tests).
  2. **Reasons:** a flag's `reason` is a short sentence for the UI, naming files by base name only (`3 failing edit cycles on foo.ts`), never folders, commands or transcript text.
  3. **Query:** `GET /api/track` takes optional `repo`, `branch`, `stage`, `proof`, `flag`, `since` (`24h|7d|30d|all`, default `7d`), `hasEdits`, `q` (substring over title, repo and branch, at most 80 characters), `sort` (`activity|stage|title|repo|flags`), `order`, `group` (`attention|repo|stage|none`), `page` and `pageSize` (default 25, at most 100). Every value is checked against an allow-list or a length bound; anything else, an unknown parameter or a repeated one is `400` with a plain error that never echoes the value. User values reach SQL only as bound parameters (`LIKE` wildcards escaped); sort columns come from a fixed map. The token stays in the `Authorization` header (D75).
  4. **Response:** the existing fields plus `page` (`page`, `pageSize`, `total`, `pages`), `facets` (counts per repo, branch, stage, proof, flag, age bucket and `hasEdits`, each over the items that pass every filter except its own dimension) and groups with `id`, `label`, `total` (whole filter) and the current page's items. Pagination is over the flat sorted list; groups are derived from the page. A page past the end is empty with `200`.
  5. **Titles:** an item with no name of its own is titled from repo, branch and the first activity date (`claude-code · main · Oct 14`), never from prompt text. Naming from prompts stays a separate privacy decision for the user.
  6. **Storage:** migration 5 adds `work_items.branch` and `has_edits` and indexes on `last_activity`, `(repo, last_activity)` and `(stage, last_activity)`. `has_edits` is false when no code edit is linked (documentation-only items included), so the UI can fold conversations without code into one group.
- **Why:** The attention view must show what needs the user now; a flag on every old item hides the few that do. Filtering, sorting and paging in the daemon keeps the page fast and the payload small at any item count, and facets computed server-side give live counts without sending every row. Allow-lists and bound parameters keep the new surface as safe as the old one.
- **Alternatives:** Filtering in the UI over all rows (payload and render cost grow with history; no server-side facets). Deleting old flags (loses evidence; a window keeps stage and proof and the flag returns if the item becomes active). Hiding backfilled items instead of un-flagging them (hides real stages). Naming sessions from the first prompt (useful, but puts transcript text into stored titles: the user's decision). Cursor paging (more moving parts than a page number for a list this size).
- **Impact:** Changes the output of the stage machine for old items (the D55 and D71 rules stay accepted; this narrows when their flags are shown). Adds `flag_window_hours` to [operations](specs/operations.md#configuration), the API contract to [web-ui](specs/web-ui.md#api-daemon-to-ui) and two columns to [data schema](specs/data-schema.md). `packages/ui` follows in `vantage-4ty4`. Revisit if 48 hours hides something the user wanted flagged, or if item counts reach tens of thousands (the per-keystroke scan would need an index of its own).

### D85. Track page controls: view state in the URL, `1` to `4` for group-by, pushes never rearrange the page

- **Status:** proposed
- **Context:** The first real run showed 300 rows under one flag with no way to filter, sort, group or page (`vantage-4ty4`). The Track page needs controls, and the specs leave open where their state lives, which keys switch grouping, and what a live push may change while the user reads a page. The spec's keyboard map already maps `g s` to Sources, so the requested `g` then `r`/`s`/`a` chords for group-by would clash on `s`.
- **Decision:**
  1. **View state** (search, filters, since, sort, order, group, page, page size) lives in the URL query string, written only where it differs from the default, with `pushState` for each control change and `replaceState` while typing a search. The last view's query string is also kept in `localStorage` (`vantage.view`) and applied when the page opens with no query. Nothing else is stored there. Unknown or invalid values fall back to the default; search text is capped at 80 characters.
  2. **Token:** never in the query string, history or `localStorage`: it stays in the URL fragment on launch, then `sessionStorage`, and is sent only as `Authorization: Bearer` (D75). The page writes `pathname` and query only, never a fragment.
  3. **Keys:** `/` focuses search, `[` and `]` turn pages, `1`, `2`, `3`, `4` group by attention, repo, stage, none (the web-ui spec already reserves `1`/`2`/`3`). No `g` chords for grouping.
  4. **Live pushes:** a push updates rows already on the page in place; it never adds, removes or moves rows, and never changes the page number. Pushes about other items only mark the counts stale, and one throttled refetch (at most once a second) replaces facets, totals and group totals while keeping the rows shown. A `resync` or reconnect refetches the current page.
  5. **Quiet groups are built by the page:** the daemon (D84) groups by attention, repo or stage and marks each row's `hasEdits`. When grouped by attention, the page moves rows without code edits into a "Conversations without code" group (total from `facets.hasEdits.false`, so it is right across pages) and, for the 30-day and all-time ranges, rows older than 7 days into "Older" (counted on the page only). Both start collapsed. The daemon's other group totals still include the folded rows.
- **Why:** A URL is the one place that makes a view shareable, survives refresh and works with the back button, and storing only the query string keeps the token out of every persistent store. Number keys avoid the `g s` clash and match the spec. Leaving rows alone on a push stops a list from shifting under a reader's cursor, which is the failure the Track page exists to prevent.
- **Alternatives:** `g` then letter chords (clash with `g s`; two keystrokes for a frequent action). View state only in `localStorage` (not shareable, no back button). Re-sorting visible rows on every push (rows jump; totals can disagree with the page). Collapsing by a flag on the group from the API (cleaner but needs a contract field the API session did not define).
- **Impact:** Adds `packages/ui` view state, toolbar and pagination; updates the web-ui spec's screen states and keyboard map. Uses the merged `GET /api/track` contract (D84) from `@vantage/core/track`. Revisit if a second page needs the same URL conventions, or if the API groups no-code and old rows itself (then the fold goes away and the totals become exact).

### D91. The skipped dot is a short dash, not a dashed ring; a legend and a stage label explain the dots

- **Status:** proposed
- **Context:** The user could not read the six dots on a real row. The "skipped or not set up" dot (a dashed ring) was almost the same as "not yet" (a thin ring) at 16 px, yet they mean different things: not yet will happen and Vantage can measure it, skipped means no configured source can measure it. D34 only fixes "shape first, then colour"; D41 and D74 list the status line's `◌` for skipped.
- **Decision:**
  1. In the web UI the skipped state is a short horizontal dash (about 7 px, 2 px thick, round caps, gray) with no ring; "not yet" stays the thin hollow ring; every other state is unchanged. Skipped dots say "no source can measure this yet" in their tooltip.
  2. The status line draws skipped as an en dash `–` instead of `◌`, so the two surfaces agree. This supersedes the `◌` glyph in D41 and D74 once accepted; their other rules stand.
  3. The Track page gets a dot legend ("What the dots mean": the six stages with the question each answers, the six states drawn with the real dot component, and the rule that an agent saying "done" never moves a dot) and a text label beside each row's dots, derived from the item's own stage, proof status, proof level, docs-only flag and flags (never from agent claims).
- **Why:** Shape must differ, not dash spacing or grey level; a dash is the simplest shape that cannot be read as a ring. A legend and label make the alphabet learnable without hover.
- **Alternatives:** A longer dash pattern or a darker ring (still a ring at 16 px). A cross or a slash (reads as failed or blocked). Leaving the status line alone (the two surfaces would disagree).
- **Impact:** Changes `Dots.svelte`, adds `Legend.svelte` and `stage-label.ts`, `packages/core/src/status-line.ts` and its tests; updates the visual-language, UX, web-ui and status-line specs. Static mockups in `docs/mockups/` still show the old dashed ring. Revisit if a source for Reviewed, Shipped or Verified makes skipped rare.

### D88. `vantage stats`: aggregates only, read-only, goals as starting points (proposed)

- **Status:** proposed
- **Context:** The first real run showed about 300 items in Needs you and hundreds of untitled Session rows, and the Phase 1 exit is a week of daily use. The user needs numbers, not impressions, that are safe to paste into an issue (privacy boundary). The specs list "usage metrics" but define no command, no metric definitions and no goals.
- **Decision:**
  1. **Read-only, store only.** `vantage stats` opens `vantage.db` with `readOnly: true`, so it works with the daemon running or stopped and never writes. It does not call the daemon or read the spool.
  2. **Aggregates only.** The output holds numbers and fixed labels: no titles, commands, paths, session ids or repo names. Source and flag names print only when they match a plain word pattern, else as `other`. The single echo is the `--repo` text the user typed.
  3. **Definitions.** *Needs you* is an item with an open, undismissed flag (D75); *recent* means the item had activity in the last 48 h. *Readable title* is any item except a provisional `session:` item, whose title is only `Session xxxxxxxx` or `repo · branch · date` (D84: never from prompt text). *Edited items Proven* is Proven items over items in Built or Proven, docs-only excluded (D71); a Built item has no fresh proof by definition, so a share of those would always read 100%. *Built, proof lost* counts Built items whose proof status is `expired`, `failed` or `weak`. *Checks run* classifies `command.ran` events with the stage machine's own allowlist (`proofFamily` in core), counts by family and reports the rest as one number, never as text. *Needs you* is also split by flag kind, with a total and a 48 h count each. *Derived sessions* are live-linked sessions with a `session.derived` event, read from the `item_sessions` view (D86) and shown as a share of linked sessions only when at least one exists. Days are UTC.
  4. **`--repo NAME`** matches a path segment of the event's `cwd` or `repoRoot`, case-insensitive, because `work_items.repo` and `events.repo` are not filled today.
  5. **Goals are starting points:** Needs you under 10 (last 48 h under 5), readable titles at least 80%, sessions anchored by issue, branch or worktree at least 70%, edited items Proven at least 50%, last stage pass within 5 minutes (D75), database within the 500 MB budget. They are constants in code for now and shown with a symbol (✅ at the goal, ⚠️ past it, ❌ far past it); reading them from `config.toml` is a follow-up bean.
- **Why:** The kill rule needs a measurement that does not depend on impressions, and one that can leave the machine in a bug report must not carry content. Reusing the stored derived tables keeps the numbers identical to what the Track page shows.
- **Alternatives:** Ask the daemon over HTTP (needs the token and a running daemon); recompute from events (can drift from what the page shows); print sample titles for context (leaks content); goals in `config.toml` now (no TOML parser, D78); a `Metrics` table sampled every minute (the specs' later design; this command covers the exit week without it).
- **Impact:** New command in the CLI and its README and operations-spec text. The repo filter and the fallback-title rule depend on today's schema; revisit them when `work_items.repo` is filled or a real request title lands.

### D94. `forgotten` is its own low-urgency group, and a backfilled conversation is never forgotten

- **Status:** proposed
- **Context:** Measured on the user's real database (aggregates from `vantage stats`): 308 items carried an open flag, of which `forgotten` 292, `thrashing` 27, `unproven_claim` 8. D84 limited `thrashing` and `unproven_claim` to recent activity but left `forgotten` as it was, and the Track page still put every flagged item under "Needs you". The 292 are mostly items from the 14-day transcript backfill: conversations Vantage first saw already days old, which nobody dropped. Putting them next to a failing edit loop from this morning hides the urgent items again.
- **Decision:**
  1. **Groups:** `attentionOf` returns `needs_you` only for an item with `thrashing` or `unproven_claim`. An item whose only open flag is `forgotten` is in a new group `forgotten` (label "Forgotten", listed after "Waiting on others" and before "Done this week", low urgency, collapsed by default in the UI, counted separately). A flag with no kind stays urgent. The `flag` facet and filter keep all three kinds.
  2. **Born stale:** `forgotten` is not raised for an item with no code edit (a conversation, or documentation only) whose last activity was already older than the threshold (5 days) when Vantage first saw it. "First seen" is the item's `work_items.created_at`, passed to the stage machine as `firstSeen`; an item not yet stored counts as first seen now. Such an item keeps its stage and gets no flag at all, now or later. An item that was fresh when first seen and then goes idle is `forgotten` as before, and so is old work that had a code edit.
  3. **Counts on Track items:** each item also carries `sessionCount` (default 1) and `derivedCount` (default 0) from the `item_sessions` view (D86), read for the page's rows only.
- **Why:** "Needs you" has to mean what needs the user now; abandoned work is worth a look but not an alarm. A conversation first seen already stale is the shape the backfill produces, and the stage machine can tell it apart from real neglect using only data it already stores, without guessing from event ids.
- **Alternatives:** Dropping `forgotten` altogether (loses a useful nudge for real dropped work). Suppressing it for every item older than N days (hides abandoned work that did have edits). Detecting backfilled events by their source ids (fragile, hooks and transcripts share ids). A session-count facet (needs a scan of all links on every request).
- **Impact:** Changes `Attention`, `ATTENTION_ORDER`, `ATTENTION_LABEL` and `attentionOf` in core, so `packages/ui` gets a fifth group to render. `StageOptions.firstSeen` is new and optional. Updates [web-ui](specs/web-ui.md) and [scoring](specs/scoring.md#staleness-and-forgotten). Existing rows keep their `created_at`, so on the next pass a backfilled conversation loses its flag. Revisit if a conversation the user cares about is never flagged, or if `created_at` is rewritten by a future migration.

### D93. SQLite migrations are one file each, checksummed, read from the package at start

- **Status:** proposed
- **Context:** Migrations were an array of SQL strings in `store.ts`, versioned by position. Parallel sessions each added one (stage machine, linker, derived sessions, Track API index), so the array conflicted on every merge, and nothing noticed if a released migration was edited. Vantage runs against the user's real database (D33). An ORM was evaluated and rejected for now (extra native or generated dependencies against the one-command install, D63 and D66); the user approved hardening the runner instead.
- **Decision:** Each migration is a file `packages/daemon/migrations/NNNN-slug.sql`. A `schema_migrations` table (migration 7) records number, name, sha256 and `applied_at`; `schema_meta` stays as a mirror of the latest number. Startup stops with a clear error on a checksum or name mismatch, a gap, a duplicate, a bad file name, or a database newer than the code. CI rejects the same file problems and any edit, rename or removal of a migration on the base branch. The runner reads the files from the package directory at start (found from the nearest `package.json`, so it works from `src/` and `dist/src/`), and the daemon package ships them through `files`. The files are not embedded in compiled code.
- **Why:** One file per migration turns a shared-array conflict into two different file names. Checksums turn a silent edit of a shipped migration into a loud failure before any change is made. Reading files keeps a migration the same text in the repo, in tests and in the package, with no build step to keep in sync. A generated module would be one more file every parallel PR conflicts on, and it needs a generation step before `vitest` runs too.
- **Alternatives:** Embed the SQL in a generated TypeScript module (survives bundling into one file, but adds a generated file that conflicts again, or a build step tests must run first; revisit if Vantage is bundled to a single file or a binary, D63). An ORM or query builder with its own migrations (Drizzle, Prisma 7, Kysely, Q31: extra dependencies, no assured `node:sqlite` support, and it still needs a checksum and freeze check). `PRAGMA user_version` instead of a table (no per-migration record or checksum). Keep the array and add a test (still one conflicting file).
- **Impact:** `packages/daemon/migrations/`, `packages/daemon/src/migrations.ts`, `tools/migrations_check.py` inside `check_docs.py`, the daemon `files` list, and the [data schema](specs/data-schema.md) spec (how to add a migration, the rules). Every later migration is a new numbered file, never an edit. A backfilled checksum for migrations 1 to 6 is of the file as shipped, not proof of what an old release ran. Revisit when the package is bundled to one file or a binary, or if the files are not found in an installed package.

### D95. A session's first request titles its provisional item, locally, behind a switch

- **Status:** proposed
- **Context:** After D84 an untitled session gets a title from repo, branch and date (`claude-code · main · Oct 14`). Many items are default-branch sessions with no ticket or branch name, so rows still look alike and the user must open each to learn what it was. What the user asked for in the first sentence is the best short label, but it is the user's own prompt text, and D84 and the privacy rules keep prompt text out of titles unless the user decides otherwise. The user decided on 2026-10-14 (in chat) that the first sentence of the first request may become the title, stored only on this machine, with a switch and a way to see and clear it.
- **Decision:**
  1. **What is taken:** the first real user request of a session, read from the head of its transcript at ingest (hooks carry no prompt text, so sessions seen only by hooks keep the fallback title). Meta lines, sub-agent files, tool results and copied parent history are skipped. Only that one message is read; a later request is never looked at, even when the first leaves nothing usable.
  2. **How it is cleaned (`requestTitle` in core):** fenced and inline code, tags, markdown links, URLs, emails, any word containing a path separator or starting with `~`, `$` or `%`, `key=value` credentials, bearer tokens, UUIDs and token-like words (known key prefixes, hex runs of 16 or more, base64-like runs, long mixed id strings) are removed. The first non-empty line is cut at its first sentence end, collapsed to one line and capped at 80 characters (cut at a word, with an ellipsis). Nothing usable left (fewer than 3 letters) means no title.
  3. **Where it lives:** the table `session_titles` (session id, title, capture time), filled once per transcript file (a marker cursor `titles:<file>`), never overwritten, and also back-filled for files already ingested. The prompt text itself is not stored in events (`prompt.submitted` keeps only its length), logs, the status file, `health.json` or `vantage doctor`. The title reaches the Track page, the live pushes and the status line only as the item's title.
  4. **Use:** the stage pass titles `session:<id>` items with it and records `work_items.title_source` as `request`, `anchor` (named by an issue key, branch or worktree, which always wins) or `fallback` (repo, branch and date), so the UI can tell them apart.
  5. **Control:** `item_titles_from_requests = false` in `config.toml` (default on; read when the daemon starts) stops capture and makes the pass ignore stored titles, so items fall back at the next pass. `vantage titles` lists what is stored; `vantage titles clear` deletes it and refreshes the items. A cleared title is not captured again; turning the setting off is how to stop capture.
- **Why:** A title in the user's own words is what makes a row recognisable, and cleaning and capping at ingest keeps the sensitive parts of a prompt out of the database in the first place, instead of hiding them at display time. A separate table and an explicit source keep it removable and visible, and the switch makes it a choice.
- **Alternatives:** Titles from a model (sends the prompt to an outside service: against the data policy). Storing the whole prompt and cutting at display (keeps what must not be kept). Keeping the cleaned first sentence on every prompt event (spreads text over many rows and contradicts "first request only"). Naming only by repo, branch and date (D84; safe, but rows stay alike). A per-repo setting (more surface than one switch needs now).
- **Impact:** `packages/core` (`requestTitle`, `firstRequestTitle`), `packages/daemon` (migration 8, `0008-request-titles.sql`, `titles.ts`, ingest and stage pass, config key), `packages/cli` (`vantage titles`). Specs [ingestion](specs/ingestion.md#request-titles), [operations](specs/operations.md#configuration), [work item model](specs/work-item-model.md) and [data schema](specs/data-schema.md) change, and the README data section says request titles are stored locally. A cleaning rule that misses a secret form leaves that text in a title: revisit after real use, and widen the rules, never loosen them. Revisit the default (on) if the user wants opt-in instead.

### D98. Releases: an in-repo release PR, one `@ymatrix1/vantage` package, and a staged npm publish with no token

- **Status:** proposed
- **Context:** Phase 1 has no release process: no tags, GitHub Releases or changelog, and installing needs a clone and a build. D63 chose an npm package, D72 per-OS native packages (named `@vantage/hook-<target>` there). `vantage` is already taken on npm (1.7.0, an unrelated project), so the product cannot use that name; `@ymatrix1/vantage` returned E404 (free as far as the registry shows). Publishing to npm and creating releases are outward-facing, and no `npm-publish` environment exists yet.
- **Decision:**
  1. **Versioning:** `tools/release.mjs` (no dependencies) reads the Conventional Commits since the last `vX.Y.Z` tag, picks the bump (`feat` minor, `fix` and `perf` patch, a breaking change minor until 1.0 and major after) and writes `CHANGELOG.md` and the root `package.json` version. One version for the whole product; workspace packages stay private at `0.0.0`.
  2. **Release PR:** workflow `release-pr` keeps one PR from `release/next` up to date on every push to `main`. Merging it is the release decision. Workflow `release` runs on the merge commit when `package.json` holds a version with no tag.
  3. **One package:** the product is the npm package `@ymatrix1/vantage` (bin `vantage`, Node 22.5 or newer, used as `npx @ymatrix1/vantage`). The native packages are renamed `@ymatrix1/vantage-hook-<os>-<cpu>` and amend the names in D72 and D80 (`tools/package-names.mjs` is the single place; the installer has the same constant and a test keeps them equal). It bundles the built `cli`, `core`, `daemon`, `hooks` and `ui` through `bundledDependencies`, staged as `node_modules/@vantage/<name>` so the relative paths the CLI uses (`../../../ui/dist`, `../../../hooks/dist/src`) stay valid. The native packages are `optionalDependencies` at the same version. `repository.url` is exactly `https://github.com/ymatrix1/vantage`. No bundler is added.
  4. **Delivery:** the release workflow builds, tests, builds the 5 native targets, creates the GitHub Release (tag, notes from the changelog, native binaries, npm tarballs, `SHA256SUMS`), attests the artifacts with `actions/attest-build-provenance`, and only then reaches the npm publish.
  5. **Gate:** `publish-npm` runs only when the repository variable `NPM_PUBLISH_ENABLED` is `true`, then waits for approval in the `npm-publish` environment. It holds **no npm token**: it authenticates by npm trusted publishing (OIDC, `id-token: write`) as the workflow file `release.yml`, whose name is therefore fixed. By default it runs `npm stage publish` (needs npm 11.15.0 or newer, pinned by exact version in the job): the owner approves each staged package with 2FA on npmjs.com before it is live. `NPM_PUBLISH_MODE=publish` allows a direct `npm publish` later. Provenance is generated by npm automatically. Never for pull requests, forks or manual dispatches. The old manual publish job of `release-native.yml` is removed so there is one publish path.
  6. **Least privilege:** top-level `contents: read`; `contents: write` only on the release and release-PR jobs, `id-token` and `attestations: write` only where needed; actions pinned by commit SHA; no `pull_request_target`.
- **Why:** An in-repo script is about 200 lines, testable on synthetic commit lists, and adds no third-party action that holds `contents: write` and `pull-requests: write`. The release PR keeps a human merge as the release decision, which matches merge-commit PRs on `main`. Bundling through `bundledDependencies` needs no new build dependency and is verified by packing and installing the tarball. `vantage-a2v` is free on npm and keeps the `vantage` command. Trusted publishing removes the one long-lived secret; staging puts a human 2FA approval in front of every live version, which is the gate.
- **Alternatives:** release-please in manifest mode (the standard tool and it supports pre-1.0 rules, but a large third-party action with write access, a manifest and config to maintain, and its changelog format is not ours to test). Tag-driven releases by hand (no release PR, so the changelog and version are edited by people). A bundler such as esbuild (one file, but a new exact-pinned dependency and a second build of the daemon). Publishing every workspace package (many names to own, and they are not a public API). An `NPM_TOKEN` environment secret (a long-lived write credential; kept only as an optional appendix in RELEASING.md). Direct `npm publish` from CI (no 2FA approval step). `vantage-cli` and `vantage` (taken on npm).
- **Impact:** Adds `tools/release.mjs`, `tools/assemble-main-package.mjs`, `tools/smoke-install.mjs`, workflows `release.yml` and `release-pr.yml`, `RELEASING.md`, `CHANGELOG.md` and `vantage --version`. Narrows `release-native.yml` to build and package (no manual publish). The owner must confirm the names, create the 6 packages once by hand (a trusted publisher can only be added to an existing package), add the trusted publishers (exact file `release.yml`, environment `npm-publish`), create the `npm-publish` environment, set `NPM_PUBLISH_ENABLED` and choose a licence (`RELEASING.md`). A new trusted publisher must complete a publish within 2 days, and npm does not validate it on save. `npm stage publish` with a tarball and `--access public` is unverified until the first run. Accepting this amends the package names of D72 and D80. Revisit if the scope changes (one line in `tools/package-names.mjs`) or if the script outgrows its size.

### D99. An item's repo is its git repo, resolved from the worktree it ran in

- **Status:** proposed
- **Context:** On the real page the Repo filter and `group=repo` listed worktree folders (`brave-joliot-995ebc`, `dev`) next to real repos, so counts per repo were wrong: an agent-only item took its repo from the last folder of the session's `cwd`. On a copy of the real store that was 148 distinct "repos".
- **Decision:**
  1. `worktree.scanned` events carry `repo {key, name, remoteUrl}` (additive): `key` is the repo key (normalised remote plus first commit), `name` is `owner/repo` from the remote or the main worktree's folder for a repo with no remote (never a linked worktree's folder), `remoteUrl` is `https://host/owner/repo` or null.
  2. At read time (each stage pass; events stay immutable, nothing migrates) an item's `cwd` is mapped to its repo by the longest scanned worktree root containing it. Older events without `repo` still map, by the repo key in their id. The result is stored in the derived `work_items.repo` as the remote path (`host/owner/repo`), or the main folder for a repo with no remote.
  3. A folder no scanned worktree contains is asked of git once (remote and first commit only), remembered for the life of the process, at most 12 new folders per pass so the daemon's event loop is not held; a folder that is gone or is not a repo has no repo (`null`).
  4. `group=repo` groups by that value with a final "No repo" group; the repo facet counts only items with a repo; each Track item carries `repoUrl` (null without a remote).
  5. **Organisation level:** the hierarchy is Organization → Repo → Branch → item. The scanner payload is `repo {key, name, org, repoName, host, remoteUrl}`: `org` is the first path segment of the remote (a GitLab subgroup stays in `repoName`), kept in the case it was written in (`Flip-to`); a repo with no remote has org `local` (shown as "Local"). `work_items.repo` keeps that case (`host/Flip-to/platform`); the key and every filter compare case-insensitively. Track items carry `org`, facets carry `org` counts, `org=` filters, and `group=org` groups (label: the spelling most of its repos use). Nested "org > repo" sections are built by the page from `group=repo`.
  6. An untitled session is titled from the resolved repo, branch and date, never from the folder; a worktree item is titled with its branch; a detached `HEAD` is titled "detached HEAD in <repo>".
- **Why:** The git remote is the one stable identity of a repo (D17); a worktree folder is a random name. Deriving at read time keeps events immutable and fixes history with no migration.
- **Alternatives:** Store the repo on every event at ingest (cannot fix history; the hook has a 100 ms budget, D67). Group by the folder's parent (still wrong for worktrees). Ask only the scanner's worktrees (misses repos the scanner was never told about: on the real copy that left 350 of 463 items with no repo, against 189 with the git fallback).
- **Impact:** `RepoInfo` and `repoInfoOf` in core, `projects.ts` in the daemon, a stage-pass step, `repoUrl` on the Track item. On a copy of the real store the distinct repos go from 148 to 8, with 189 items having no repo (folders that are gone or are not repos). A first pass after upgrade resolves 12 folders at a time, so repos fill in over a few passes. Revisit if asking git per folder proves too slow, or if projects get a config mapping.

### D100. Track page v2: projects first, rows named by branch, detail inline, repo from the git remote

- **Status:** proposed
- **Context:** On the real page the user found names hard to read (a row titled with a branch and subtitled with a worktree folder such as `brave-joliot-995ebc`), no links, rows that cannot expand, and a layout that is not organised top-down. The repo of an agent-only item was the last folder of the session's `cwd`, which for a worktree is a random folder name.
- **Decision:**
  1. **Layout, top to bottom, each level one question:** L0 one-line header ("Last 7 days: N in progress, M need you (a unproven, b stuck), K older", range, Stale or Offline badge; each number filters). L1 projects, the default grouping, each collapsible with its counts, last activity and a repo link, projects with the most "needs you" first. L2 one row per item. L3 inline detail on click or `Enter` (`Esc` closes all, `e` opens every row of the group).
  2. **Row naming:** title is the ticket title or key, else the branch without an agent prefix (`claude/`) and a random six-hex suffix, else the fallback title; subtitle is the branch and a short relative time. The worktree folder is shown only in the expanded detail.
  3. **Repo from the remote:** the stage pass stores an item's `repo` as the normalised remote path (`host/owner/repo`) when the item's `cwd` lies in a worktree the git scanner saw, else what the events named. No schema change. The page shows `owner/repo` and links only a real remote (`https://host/owner/repo`).
  4. **Links** are built only from that remote, a branch name (escaped per segment) and a hex commit sha, `https` only, `target="_blank"` with `rel="noopener noreferrer"`. No PR or ticket link is invented; slots wait for the GitHub source and the tracker (D90).
  5. **Detail:** a new read-only `GET /api/items/:id` returns repo, repo URL, branch, worktree path, last commit sha, sessions (with their parent) and edited files by base name; the trace endpoint supplies stage history and proofs. Nothing is sent to an outside service.
  6. **Header counts** come from a second request with the same filters, grouped by attention, one row.
- **Why:** The first question is "how is my work", the second "which project", the third "which item"; the evidence belongs one click away. Titling by branch uses the name a person chose; the remote is the one stable identity of a project (D17 repo keys).
- **Alternatives:** Keep grouping by attention (mixes projects, hides which repo needs you). Store the project in a new column (a migration for what the stage pass can rewrite). Build PR links from branch names (invents a link that may not exist). Show the worktree folder as the subtitle (what the user disliked).
- **Impact:** Adds `projects.ts` and `item-detail.ts` to the daemon, a route in `http.ts`, and `Header`, `Row`, `Detail`, title, link and project helpers to the UI; changes the default Track grouping to project; updates the web-ui and UX specs. Limits: projects are ordered by the rows on the current page (the API pages rows, not projects), and group totals include rows the page folds into "Conversations without code". Revisit when the API can sort and page by project.

### D102. Edits to scratch and git-ignored files are not code edits

- **Status:** proposed
- **Context:** On the real Track page, flag reasons read "Session stopped after editing daemon.log without proof". The stage machine (D71) counts every `file.edited` event as a code edit, so a log, temp output or ignored file expires proof and raises `unproven_claim` and `thrashing`. D70 separates writes inside the repo from writes outside it, but a log inside the repo is still inside it.
- **Decision:**
  1. **What is scratch:** a path is scratch when its name says so (extension `.log`, `.tmp`, `.out`, `.bak`, `.swp`, `.pyc`, `*~` and similar, rotated logs, a folder named `tmp`, `temp`, `__pycache__`, `node_modules` or a cache folder) or when git ignores it in its repo (and does not track it). A tracked file is never scratch. An untracked file that is not ignored counts as code, as before (a throwaway `docs2.py` is not detected).
  2. **Effect:** an edit event whose paths are all scratch is not a code or documentation edit: no stage move, no proof expiry, no thrash cycle, no `unproven_claim`. It stays linked to the item and is recorded as `scratchEdits` and the scratch file base names (at most 20) in the item state. An event with any non-scratch path counts as code. An edit with no readable path, or whose path cannot be classified, counts as code.
  3. **How git is asked:** the stage pass collects the absolute edited paths, finds each one's repo (`git rev-parse --show-toplevel` from its nearest existing folder) and asks `git check-ignore` in batches of 200, read-only, with a 5 s timeout and bounded output. Answers are cached for 5 minutes (at most 20,000 paths); git missing, a path outside any repo, a relative path or any git failure leaves the path unclassified, so only the name rules apply. The name rules for temp and cache folders read the path inside the repo, so a repo that lives under a temp folder is not all scratch. Nothing is stored: the pass recomputes from events, so existing history is reclassified at the next pass. `gitScratch: false` turns the git part off.
- **Why:** The repo's own ignore rules are the best available signal for "not part of the work", they cost two git calls per batch, and they cannot hide real work: tracked files always count. Name rules cover the cases with no git or no ignore rule.
- **Alternatives:** Name rules only (misses ignored build output and generated files). Asking git at ingest and storing a flag on the event (events are immutable and already ingested ones would stay misclassified). Treating every untracked file as scratch (hides new source files, the commonest real edit). Deleting scratch events (loses evidence).
- **Impact:** `packages/core/src/scratch.ts`, `StageOptions.scratchPaths` and `repoRelative`, `ItemState.scratchEdits` and `scratchFiles`; `packages/daemon/src/scratch.ts` and the stage pass. Updates [ingestion](specs/ingestion.md#scratch-files) and [proof](specs/proof.md). D71 is applied differently, not edited. A file the user wants counted but git ignores is not counted; revisit if that bites. A repo with a huge ignore list costs more per batch; the 5 s timeout bounds it.
