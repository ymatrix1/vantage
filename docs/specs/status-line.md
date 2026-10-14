# Spec: status line

> **Status:** draft. Phase 1 implementation: `packages/core/src/status-line.ts` (renderer), `packages/daemon/src/status-file.ts` (writer), `packages/hooks/src/statusline.ts` (command). Open choices are in D73 (proposed).

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

The track has six steps: Asked, Built, Proven, Reviewed, Shipped, Verified. Phase 1 knows the first three; the rest stay `○`.

| Item state | Track |
|---|---|
| Asked | `●◉○○○○` |
| Built, no fresh proof (none, expired, failed, weak) | `●●◐○○○` |
| Proven, L1 | `●●●¹○○○` |
| Proven, L2 | `●●●²○○○` |
| Docs only (proof not required) | `●●◌○○○` |
| Any open flag | the current step shows `◍!` (Asked: Built slot; Built or Proven: Proven slot) |

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

Width budget: fits in `COLUMNS` (80 when unset). Segments drop from the right: pings first, then the title is shortened with `…` (at least 6 characters), then dropped. Under 50 columns it shows only items 1 and 3; if even that does not fit, the repo is dropped, then the head is cut with `…`. Widths count code points, and `◍!` counts as two.

## Behaviour

- The status line command reads a small summary file the daemon rewrites on every change (see [architecture](../ARCHITECTURE.md#runtime-proposed)). It never calls the daemon, so it never blocks the terminal.
- Claude Code runs the command on session start, each assistant message, `/compact` and mode changes, debounced at 300 ms, and cancels a run still in flight when a new one starts. An idle session doesn't refresh, so Vantage sets `refreshInterval` to 30 s (see research [R2](../research/claude-code-hooks.md)).
- It reads the current session from stdin `session_id` and its width from the `COLUMNS` environment variable.
- If the summary is older than 5 minutes it shows `vantage · stale` instead of guessing. With no summary file, or one that can't be read, it shows `vantage · offline` and exits 0. The daemon being down never breaks the session.
- The summary is `~/.vantage/status.json` (`$VANTAGE_HOME`): `{v, writtenAt, needsYou, pings, sessions: {<session_id>: {stage, proofStatus, proofLevel, docsOnly, repo, title, flags}}}`. The daemon rewrites it (temp file, then rename) after every stage pass (every 30 s, so also on every stage change), for sessions active in the last 7 days. A session maps to the linked item with its latest event.
- `needsYou` counts items with an open, undismissed flag across all projects. `pings` is 0 until the ping source exists (Phase 3).
- A session with no item shows `vantage · <repo>` and the needs-you count, with the repo from stdin `workspace.repo.name` or the folder name.
- Titles show at most 4 words, with a `type/` branch prefix dropped and `-` and `_` read as spaces.
- Whether the Claude desktop app (Code tab) shows a status line is unverified (Q29).
- Quiet mode (`VANTAGE_STATUSLINE_QUIET=1`) shows only the needs-you count, or `nothing needs you`.
- Color is on unless `NO_COLOR` is set. The text is identical without it.
- No emoji, for consistent rendering across terminals.

## Install

Add this to the Claude Code `settings.json` (the command runs the built JavaScript, D67; Vantage does not edit your settings):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/vantage/packages/hooks/dist/src/statusline-bin.js",
    "refreshInterval": 30
  }
}
```

`statusLineSettings(command)` in `@vantage/hooks` produces this block. The `vantage add` installer (`vantage-p9x2`) will write it.

## Measured

On a Windows dev machine, median of 25 real runs of the built command: bare `node -e 0` 71 to 77 ms, status line command 89 to 91 ms, so the command itself adds about 15 ms to node start-up, under the 100 ms budget. In process, reading the file and rendering takes under 10 ms (tested). The command imports only `@vantage/core/status-line`, not all of core, which cut about 15 ms.

## Tests

- Render each state with and without color.
- Truncation at 80, 60 and 40 columns.
- Stale summary handling, and the `offline` line when the daemon is down.
- The real command exits 0 on garbage input, a half-written file and a missing file.
