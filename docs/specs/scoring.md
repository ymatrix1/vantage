# Spec: scoring

All scores are computed in code from explicit signals, so they're explainable. A card can always show "why is this ranked here?".

## Priority

Signals, roughly in order of weight:

| Signal | Source |
|---|---|
| Someone is blocked on you (re-review request, direct question, mention from a person) | GitHub, Slack, Jira or Linear |
| Due date proximity | Jira or Linear |
| Red flags (`regression`, `collision`, `waiting_on_you`, `ai_decided`) | Vantage |
| Issue priority | Jira or Linear |
| Blocks other items | Jira issue links, Linear relations (blocks, blocked by), PR dependencies |
| Staleness (an item drifting toward `forgotten`) | Vantage |

The user can **pin** or **demote** an item. Overrides win, and they're recorded as feedback to tune weights later.

Focus shows the top 3. Everything else goes to the batched digest.

## Difficulty

- **Estimate** (before work): story points if present; otherwise S/M/L from the size of the request and the number of anchors. Shown as S/M/L.
- **Actual** (as work happens): sessions, files and lines touched, thrash loops, review rounds, elapsed active time. Shown next to the estimate so the gap is visible.

## Spread

The colored bar on a card. It shows linked effort split by:

- agent (Claude Code, Codex),
- review rounds,
- post-ship fixes (follow-up cards roll up to the parent).

Unit: active minutes when available, otherwise event count. Hover shows per-session breakdown.

## Staleness and forgotten

- `last_activity` = latest linked event of any kind.
- `forgotten` when stage is Asked or Built and `now - last_activity > N days` (default 5).
- Commitments ("I'll check", "will fix", "on it") by the user with no linked activity within N days are also `forgotten`.

## Digest batching

- Changes that aren't red are queued and shown at user-chosen times (default 10:00 and 14:00).
- The digest summarizes per item ("PR #412 needs 2 fixes"), never a raw event feed.
- It always ends with a "safe to ignore" count: items with no change and no flags.
