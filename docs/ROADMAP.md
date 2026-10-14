# Roadmap

Built in layers. Local sources first, then GitHub, then CI/CD and monitoring, then the issue tracker (Jira or Linear) and Slack. Each phase must be useful on its own.

## Phase 0: measure and research (timebox: 1 week)

- [x] Use DuckDB to mine existing Claude Code and Codex transcripts (queried directly as `.jsonl`) plus `gh` data to get baselines: share of sessions ending with unproven edits, thrash loops, abandoned dirty work, review rounds per PR, time to first review.
- [x] **Exit:** a short baseline report in `docs/research/baseline.md` that ranks the pains by real numbers.
- Epic bean: `vantage-pdgc` (completed 2026-10-14: R1, R2, R4 and R13 done; see [baseline](research/baseline.md)). Other research beans stay open for the phase that needs them.
- **Must-haves** for the timebox: R1 baseline (`vantage-mmum`), R2 Claude Code hooks (`vantage-o3sq`), R4 GitHub notifications (`vantage-ql2e`), R13 Explain engine (`vantage-2vum`). Everything else waits for the phase that needs it (the "Needed by" column).

| Lane | Beans | Blocked by | Needed by |
|---|---|---|---|
| Agent data | `vantage-mmum` (R1 baseline), `vantage-o3sq` (R2 hooks), `vantage-ab70` (R3 Codex), `vantage-r43j` (R8 reuse) | none | Phase 0 (R1, R2); Phase 1 (R3, R8) |
| Remote sources | `vantage-ql2e` (R4 GitHub), `vantage-wok9` (R5 deploy and monitoring), `vantage-i3ku` (R6 Slack), `vantage-vncu` (R7 Jira and Linear) | none | Phase 0 (R4); Phase 5 (R5); Phase 6 (R6, R7) |
| Platform and look | `vantage-aveh` (R9 Windows), `vantage-i3pu` (R11 theme), `vantage-lnws` (R12 Vibe Kanban) | none | Phase 1 (R9); Phase 3a (R11, R12) |
| Judge | `vantage-ibuz` (R10 model comparison) | R1, data policy decision | Phase 3b |
| Explain and look | `vantage-2vum` (R13 Explain engine), `vantage-700a` (R14 scene palettes) | none | Phase 0 (R13); Phase 3a (R14) |
| Your decisions | `vantage-h8fv` (data policy), `vantage-akld` (Slack admin) | none | Phase 3b (data policy); Phase 6 (Slack admin) |

## Phase 1: first usable slice

The smallest version worth using daily. Only Claude Code and git; only Asked, Built and Proven.

- Epic bean: `vantage-fmfh`.

| Lane | Beans | Blocked by |
|---|---|---|
| Foundation | `vantage-vnn4` (scaffold, tests, code CI) | none |
| Capture | `vantage-3vuw` (hooks, spool, ingest, backfill), `vantage-in31` (git scanner), `vantage-0k45` (scan loop) | scaffold |
| Core | `vantage-9xbi` (linker), then `vantage-lxud` (stage machine and proof) | capture |
| Surfaces | `vantage-8nb2` (Stop gate), `vantage-p9at` (status line), `vantage-olgf` (Track page) | stage machine |
| Delivery | `vantage-p9x2` (install with a prompt, `vantage add`, `doctor`) | capture and surfaces |
 Hook cold start cut from a median 126 to 133 ms to 95 to 99 ms by running built JS; a native binary is the open next step (`vantage-of25`, D67). Measured next: Rust and Go median 26 to 33 ms, p95 39 to 52 ms; Rust per-OS npm packages accepted in D72 (`vantage-xex6`); shipping is `vantage-bfr1`.
- [x] Hook collector writing to the spool; daemon ingesting it into SQLite; transcript backfill.
- [x] git scanner for registered repos and worktrees: discovery, events, repo identity, cadence helper (`vantage-in31`), scheduling loop and cursor persistence (`vantage-0k45`).
- [x] Linker with branch or worktree and issue-key anchors only (`vantage-9xbi`). Delivered: pure linker in core, `links` table, undo. The scheduled link pass arrived with the stage machine (`vantage-lxud`). Remaining: the item-view undo control (Track page).
- [x] Stage machine for Asked, Built, Proven, with proof at L1 and proof expiry (`vantage-lxud`, D71). Delivered: pure machine in core, scheduled pass, `work_items`, `proofs`, `flags` and `stage_changes` tables, read functions. Output capture for zero-test detection is a follow-up bean.
- [x] `Stop` hook proof gate in warn mode (`vantage-8nb2`, `vantage-cji5`, D73). Delivered: `session.stopped` capture, the gate command with modes off and warn, silence when the daemon is down, docs-only sessions skipped. Block mode is parsed but not wired (Q11). Registering the hook command in Claude Code settings arrives with the install bean (`vantage-p9x2`).
- [x] Status line: edits vs. proof (`vantage-p9at`). Delivered: pure renderer in core, daemon summary writer on the stage loop, `statusline-bin.js` command and settings snippet. Remaining: the running daemon must start the stage loop with `statusFile` (follow-up bean), and "sessions waiting" needs the pings source.
- [x] A minimal Track page (attention grouping, six-dot rows) on a secured localhost server (`vantage-olgf`, D75 proposed). Delivered: daemon server with token, Host and Origin checks, read-only `/api/track`, `/api/items/:id/trace`, `/api/diagnostics`, and the page with loading, empty, error, stale and partial states and `j`, `k`, `Enter`, `Esc`, `?`. Remaining, as follow-up beans: live updates over WebSocket, starting the server and `vantage open`, component tests.
- [ ] Install with a prompt: `docs/install-for-agents.md` works end to end in Claude Code and Codex on a fresh machine.
- [ ] **Exit:** used every day for a week, and the morning catch-up happens on the Track page instead of in terminals.

## Phase 2: work items and board

- [ ] Linker with deterministic anchors (branch or worktree, issue key in branch, todos).
- [ ] Stage machine for Asked, Built and Proven.
- [ ] Local web UI: Track (attention and project grouping), Item and Journal; "since yesterday" filter.
- [ ] Ghost proposals from sessions with no edits.
- [ ] **Exit:** the morning catch-up uses the board instead of terminals.

## Phase 3a: the landscape

- [ ] Priority, difficulty, spread, staleness.
- [ ] Focus drawn as the landscape (dot characters, bands, shelf, sky), with the Track page as fallback.
- [ ] Toasts for red items; `waiting_on_you` and `forgotten` flags.
- [ ] Contexts (Work, Personal) and project settings on the Sources page.
- [ ] **Exit:** the morning catch-up starts on the landscape for a week, and the user can say what needs them without opening a terminal.

## Phase 3b: understanding

- [ ] Explain layer 1 (evidence-only), then layers 2 and 3 (byproduct capture and `/vantage-explain` in session); layer 4 headless as opt-in.
- [ ] Decision log from agent transcripts and Vantage actions; approve or change proposed AI decisions.
- [ ] Inbox page and digest batching with "safe to ignore".
- [ ] **Exit:** Explain is used at least once a day, and every AI decision in the week was reviewed.

## Phase 3c: calm

- [ ] Evening landing and morning wake-up, with the one-tap mood check.
- [ ] Calm gamification: proof arcs, stars, gentle streaks, rare badges; quiet mode.
- [ ] **Exit:** the felt-load score trends down over a month (D40), or the features are cut.

## Phase 4: reviews

- [ ] GitHub PR ingestion; Reviewed stage and sub-states.
- [ ] `claimed_fixed` detector; re-review tracking.
- [ ] Pings on GitHub: `owe_reply` for review requests and questions, `follow_up_due` for reviews you requested, `close_the_loop` for PR requesters.
- [ ] **Exit:** for two weeks, every review thread on your PRs is tracked to resolution, and no "claimed fixed" reaches a reviewer without the lines changed.

## Phase 5: ship and verify

- [ ] GitHub deployments and Actions; Shipped and Verified stages.
- [ ] `shipped_unverified` and `regression` flags; follow-up cards.
- [ ] Monitoring adapter for the tool actually in use.
- [ ] **Exit:** every shipped item reaches Verified or gets a flag within its monitoring window.

## Phase 6: issue tracker and Slack

- [ ] Tracker adapter with Jira and Linear implementations; build whichever is in use first.
- [ ] Assigned issues as Asked items; priority and due date.
- [ ] Unseen mentions; commitment detection.
- [ ] Pings on Slack, Jira and Linear: owed replies, nudges and close-the-loop drafts.
- [ ] Decisions from PR reviews, Slack, Jira and Linear in the decision log.
- [ ] **Exit:** for a week, no mention or owed reply older than one working day goes unnoticed.

## Later

- [ ] Behaviors with proof badges and AI-decided detection.
- [ ] Codex parity for live events.
- [ ] Judgment model layer.
