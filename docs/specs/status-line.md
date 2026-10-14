# Spec: status line

> **Status:** draft.

The status line is the always-visible ambient surface inside every Claude Code session. A terminal can't draw the dot alphabet, so this spec maps it to text.

## Glyphs

Shape first, color optional (terminals may have no color, and the shape must still work).

| State | Glyph | Color when available |
|---|---|---|
| Done | `●` | green |
| In progress | `◉` | blue |
| No proof | `◐` | yellow |
| Needs you | `◍` followed by `!` | red |
| Skipped | `◌` | gray |
| Not yet | `○` | gray |

Proof level on the Proven dot is shown as a superscript digit: `●²` = L2. Verified implies L4 and needs no digit.

## Layout

```
vantage · billing-api · ●●◐○○○ Checkout fixes · 2 need you · 1 owe reply
```

Left to right, dropping segments from the right when space runs out:

1. `vantage` and the repo of the current session.
2. The **current session's item**: its six-step track and 2–4 word title.
3. **Needs-you count** across all projects (red when > 0).
4. **Pings count** (`owe reply`), only when > 0.
5. Nothing else. No percentages, no timers.

Width budget: fits in 80 columns; under 50 columns it shows only items 1 and 3.

## Behaviour

- The status line command reads a small summary file the daemon rewrites on every change (see [architecture](../ARCHITECTURE.md#runtime-proposed)). It never calls the daemon, so it never blocks the terminal.
- Claude Code runs the command on session start, each assistant message, `/compact` and mode changes, debounced at 300 ms, and cancels a run still in flight when a new one starts. An idle session doesn't refresh, so Vantage sets `refreshInterval` to 30 s (see research [R2](../research/claude-code-hooks.md)).
- It reads the current session from stdin `session_id` and its width from the `COLUMNS` environment variable.
- If the summary is older than 5 minutes it shows `vantage · stale` instead of guessing.
- Whether the Claude desktop app (Code tab) shows a status line is unverified (Q29).
- Quiet mode shows only the needs-you count.
- No emoji, for consistent rendering across terminals.

## Tests

- Render each state with and without color.
- Truncation at 80, 60 and 40 columns.
- Stale summary handling.
