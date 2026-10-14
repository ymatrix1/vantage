# UX

## Principles

1. **One question per page.** Each page answers exactly one question (see [pages](#pages)).
2. **Status comes only from evidence.** Never from what an agent says.
3. **One line per row, one action per alert.** No paragraphs. Card and row text stays under about 140 characters. Transcripts are one click away, never shown by default.
4. **Fixed color meaning everywhere:** gray = not started, blue = in progress, amber = unproven or at risk, red = needs you, green = done.
5. **Calm by default.** Top 3, not top 30. Interrupt only for red. Batch the rest. Say "safe to ignore" out loud.
6. **Honest dots.** A skipped or unconfigured stage is a gray dash, never green.
7. **Visual first.** Shape, color, size and position carry state; 2–4 word titles carry identity; about 30 words per screen. Defined in the [visual language spec](specs/visual-language.md).
8. **Attention first, project second.** Default grouping is by what needs you, across all projects. Grouping by project is one click away.

## Organization: context, project, work item

| Level | What it is | Default |
|---|---|---|
| **Context** | A top-level switch such as *Work* and *Personal* | Inferred from repo location or org; user can edit |
| **Project** | A Jira epic, a Linear project, or a group of repos the user defines | One project per repo |
| **Work item** | One card (see [work item model](specs/work-item-model.md)) | |

- A context switch (Work, Personal, All) hides everything outside the selected context, for example personal projects during work hours.
- A project can span several repos; a repo can belong to several projects only through explicit user choice.

## Pages

| Page | Question | Layout |
|---|---|---|
| **Focus** (home) | What matters today? | Top 3 cards plus a batched digest |
| **Track** | Where is all my work? | One row per item with an inline six-dot stage track |
| **Item** | Is this right? | Stage track, behaviors with proof, review, after-ship, history, small relationship graph |
| **Journal** | What happened? | Timeline by day; "since yesterday" by default (the morning standup) |
| **Inbox** | What do people need from me? | Mentions, review requests and commitments, grouped by person |
| **Sources** | Can I trust this data? | Per-source last sync, errors, rate limits; settings |

**Overlays** open on top of a page instead of being pages: the Explain panel, the evening landing, the first-run legend and the command palette. "Decisions made" for a project or week is a Journal filter, not a page.

Ambient surfaces (status line, toasts, badge) are always present.

### Focus (home)

Focus is drawn as the **landscape**: work items as dot characters, with needs-you in the foreground, moving work in the middle, waiting work on the horizon and verified work as stars in the sky (see [visual language](specs/visual-language.md#the-landscape-home)). The elements below appear inside it or on click.


- Header: "Today, 3 things matter" and "N other changes batched for HH:MM".
- Three focus cards, from any project. Each shows title, project tag, one-line context, priority chip with reason ("P1 · blocks Ana"), difficulty (S/M/L) and the spread bar.
- A batched digest panel: Reviews, Mentions you haven't seen, Going stale, Shipped but unverified, and "Safe to ignore today · N items".

### Track

The main "all work" view. A table, not a board, because it stays readable with many items and keeps priority visible.

- **Row:** priority chip, title, project or repo with one line of evidence, six-dot track (Asked, Built, Proven, Reviewed, Shipped, Verified), main flag, last activity.
- **Dot states:** filled green = done, blue ring = current, amber = at risk (for example unproven), red = needs you, a short dash = skipped or not configured.
- **Short tracks:** `review_request` and `commitment` items show only their relevant dots.
- **Group by** toggle:
  - **Attention** (default): Needs you, In progress, Waiting on others, Done this week (collapsed).
  - **Project:** one collapsible header per project with a stage health bar (share of items per stage) and a one-word summary ("2 need you", "1 at risk", "calm").
  - **Stage:** rows grouped by current stage.
- **Filters:** context, project, flag, agent, item kind, and proof state (`unproven`, `expired proof`, `failed proof`, `weak proof`).
- **"Moved since yesterday"** marker on rows whose stage changed.
- **Board toggle:** an optional kanban rendering (six columns) of the same data, for people who prefer it. Not the default.

### Item

- Title, project, ticket and PR links, the stage track.
- **Behaviors:** one row each. AI-decided behaviors are marked with Approve or Change.
- **Proof:** one row per behavior with a badge showing type and level (L1 ran, L2 linked, L3 behavior, L4 production), last run time and command. Expand a row for the result summary, output excerpt or screenshot. Expired and failed proofs stay visible in a history list. See the [proof spec](specs/proof.md).
- **Decisions:** every choice made by the AI or a person, newest first, with proposed AI decisions to approve or change. See [decision log](specs/decision-log.md).
- **Review:** threads with status, including `claimed_fixed`.
- **After ship:** deploy, post-deploy checks, monitoring window, any regression and its follow-up item.
- **History:** a horizontal strip of events by day, agent and session ("Mon · Claude · discussed → Tue · Codex · built 3 files → Wed · Claude · 1 of 3 proven").
- **Links:** a small relationship graph (item ↔ sessions ↔ PRs ↔ tickets ↔ Slack threads ↔ follow-ups). This is the only place a graph is used; graphs are hard to scan as a main view.
- **Actions:** Explain, Resume with context, Ask for proof, Mark verified by hand, Park, Split, Merge, Unlink.
- **Explain** (`e`) opens a top-down brief (answer first, Situation, Complication, Resolution) and expandable issue trees for *why we built it* and *where it stands*. See the [Explain spec](specs/explain.md).

### Journal

- Vertical timeline grouped by day, then by project.
- Default range: since the user was last active (usually "since yesterday").
- Each entry is one line: stage changes, merges, deploys, regressions, new mentions. No raw event feed.
- Filters: project chips, context.

### Inbox

- Grouped by person, then by item, in three sections: **You owe** (`owe_reply`), **Nudge** (`follow_up_due`) and **Tell them** (`close_the_loop`). See [pings](specs/pings.md).
- Mentions, review requests and commitments, with "seen" state as defined in [operations](specs/operations.md#seen-state).
- One action per row: Reply, Nudge or Tell (each drafts a message you send yourself), or Mark done.

### Sources

- Per source: last successful sync, last error, rate-limit headroom, enabled or disabled.
- Settings: contexts and projects, digest times, quiet hours, thresholds, proof gate mode, engines, budgets and the data policy for outside models (see [settings](specs/settings.md)).

### Ambient

- **Status line** in every Claude Code session, using text glyphs for the dot alphabet (see [status line spec](specs/status-line.md)), for example `vantage · billing-api · ●●◐○○○ Checkout fixes · 2 need you`.
- **Toasts** only for red items, respecting quiet hours.
- **Badge count** of red items.

## Look and themes

**Default look: calm, in the spirit of Pane's "Folio" theme** ([runpane.com](https://runpane.com/)): quiet surfaces, low contrast chrome, color reserved for meaning. Pane is AGPL-licensed, so Vantage takes visual inspiration only, never its code or assets. The exact palette and type are defined when the UI phase starts (bean: Folio theme study).

**Themes are token-based:**

- Every color, font and radius in the UI comes from named design tokens, never hard-coded values.
- Token groups:
  - **Surfaces and text:** page, panel, card, primary, secondary and muted text, borders.
  - **Meaning:** stage dots (done, current, at risk, needs you, skipped) and flag severities (red, amber), plus agent colors for the spread bar.
  - **Type and shape:** font families and sizes, radius, density.
- **Built-in themes:** the calm default (light and dark), plus a few alternatives.
- **Custom themes:** a user theme is a small file in `~/.vantage/themes/` that overrides any subset of tokens. It can be switched live from the Sources page.
- **Guardrails for custom themes:** meaning colors must stay distinguishable from each other and meet WCAG AA contrast against their surface. Vantage checks this when loading a theme and warns, then falls back to the default for any failing token. A theme can restyle the calm, never break the meaning.

## View choices considered

| Option | Verdict |
|---|---|
| Kanban board (Trello-like) | Optional toggle on Track. Gets noisy past about 15 items; priority hard to see. |
| Graph view | Only inside Item. Hard to scan, unstable layout. |
| Rows with stage track | **Default for Track.** Scans like a table, scales, keeps priority visible. |
| Timeline | Journal and Item history. Good for "what happened", not for current state. |

## Mockups

Mockups were made in the planning conversation: lifecycle track, board, item detail, Focus, Track (attention grouping), Track (project grouping). They're recreated as static HTML with synthetic data in [docs/mockups/index.html](mockups/index.html) (pages) and [docs/mockups/visual.html](mockups/visual.html) (vocabulary, landscape, Explain).
