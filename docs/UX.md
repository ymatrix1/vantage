# UX

## Principles

1. **One question per screen.** Focus: "what needs me?". Board: "where is everything?". Item: "is this right?".
2. **Status comes only from evidence.** Never from what an agent says.
3. **One line per row, one action per alert.** No paragraphs. Card text stays under about 140 characters. Transcripts are one click away, never shown by default.
4. **Fixed color meaning everywhere:** gray = not started, blue = in progress, amber = unproven or at risk, red = needs you, green = done.
5. **Calm by default.** Top 3, not top 30. Interrupt only for red. Batch the rest. Say "safe to ignore" out loud.
6. **Honest dots.** A skipped or unconfigured stage is hollow, never green.

## Surfaces

### Focus (default screen)

- Header: "Today, 3 things matter" and "N other changes batched for HH:MM".
- Three focus cards. Each shows title, one-line context, priority chip with reason ("P1 · blocks Ana"), difficulty (S/M/L), and the spread bar.
- A batched groups panel: Reviews, Mentions you haven't seen, Going stale, Shipped but unverified, and "Safe to ignore today · N items".

### Board

- Six columns, one per stage: Asked, Built, Proven, Reviewed, Shipped, Verified.
- Cards: title, repo, one-line evidence ("3 files dirty", "12 tests pass"), flag chips.
- Ghosts are dashed cards in Asked.
- "Moved since yesterday" marker on cards that changed stage. The morning standup is this board with the "since yesterday" filter on.
- Filters: repo, flag, agent.

### Item detail

- Title, repo, ticket and PR links, the six-dot stage track.
- **Behaviors:** one row each with a proof badge (proven, no proof, failed). AI-decided behaviors are marked and have Approve or Change.
- **Review:** threads with status, including `claimed_fixed`.
- **After ship:** deploy, post-deploy checks, monitoring window, any regression and its follow-up card.
- **History:** a horizontal strip of events by day, agent and session ("Mon · Claude · discussed → Tue · Codex · built 3 files → Wed · Claude · 1 of 3 proven").
- **Actions:** Resume with context, Ask for proof, Park, Unlink.

### Ambient

- **Status line** in every Claude Code session, for example `vantage · flipto-dbt · 3 edits, 0 proof · 2 waiting on you`.
- **Toasts** only for red items.
- **Badge count** of red items.

## Mockups

Early mockups were made in the planning conversation (lifecycle track, main board, item detail, Focus screen). Recreate them as static HTML in `docs/mockups/` when the UI phase starts.
