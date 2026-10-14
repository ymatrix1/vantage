# A2V plugin

The A2V (Asked to Verified) working method for AI coding agents, packaged for Claude Code. Works in any project.

## Install

```bash
claude plugin marketplace add ymatrix1/vantage
claude plugin install a2v@vantage
```

Then **start a new session**: plugins load at session start.

## What you get

| Piece | Always on? | What it does |
|---|---|---|
| Communication rule | **Yes**, via a `SessionStart` hook | Answer first, visual, short, full sentences, one example for complex ideas |
| Output style "A2V Top-down" | **No: choose it** in the app's output style setting or with `/output-style` | Makes the rule the default style of every reply |
| `explain-top-down` | On demand | Headline, SCR, MECE breakdown, example, one main visual |
| `prove-it` | On demand | Proves a change with a check after the last edit, with level L0-L4 |
| `record-decision` | On demand | Six-field decision records; agent choices are proposals |
| `handoff` | On demand | Short state notes in `~/.a2v/handoffs/`, outside the repo |
| `land-the-day` | On demand | Close, park or schedule every open loop |
| `answer-review` | On demand | Verify review findings, fix with proof, draft replies |

## Notes

- Claude Code plugins can't ship rules files, so the communication rule reaches each session through the hook in `hooks/`. It needs Node.js; if Node is missing, the hook stays silent and nothing breaks.
- Other agents (Codex, opencode) can read `rules/communication.md` directly from their own instruction files.
- None of the skills commits, pushes or posts without your OK.
