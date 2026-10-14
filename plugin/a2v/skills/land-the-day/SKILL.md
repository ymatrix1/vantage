---
name: land-the-day
description: End-of-day ritual that closes open loops so work doesn't follow you home - find uncommitted work, unproven edits, open questions and promises, and decide for each one whether to close, park or schedule it, then write handoff notes. Use when the user says "land the day", "wrap up", "end of day", "I'm stopping", or "what's still open?".
---

# Land the day

Open loops keep the mind busy after work. Landing turns every loop into one of three clear states, so the user can stop thinking about it.

## 1. Find the open loops

Look, don't guess. For each repo the user worked in today (ask if unsure):

| Loop | How to find it |
|---|---|
| Uncommitted work | `git status --short` in the repo and its worktrees (`git worktree list`) |
| Unpushed commits | `git log @{u}..HEAD --oneline` |
| Built, not proven | Edits with no passing check after them (see `prove-it`) |
| Questions waiting on the user | From this session, and from today's handoff notes |
| Promises made | "I'll check", "will fix" said today, if visible |
| Open PRs needing action | `gh pr list --author @me` and review requests, if `gh` is available |

## 2. Show them in one table

| Loop | Where | Suggested |
|---|---|---|
| `retry.ts` uncommitted | api, `feat/retry` | Close: commit as WIP |
| Dead-letter not proven | api | Schedule: first thing tomorrow |
| "Max retries 3 or 5?" | this session | Close: decide now |

## 3. Decide each one with the user

- **Close:** finish it now in under five minutes (commit, push, answer, decide).
- **Park:** consciously drop it for now; note why.
- **Schedule:** write it as the first step of tomorrow's handoff note.

Never commit, push or reply on the user's behalf without their OK for that item.

## 4. Write the handoffs

Use the `handoff` skill for each branch with work in progress.

## 5. Finish in one line

> **Landed:** 5 loops, 3 closed, 1 parked, 1 scheduled for tomorrow. Nothing else is waiting on you tonight.

If something can't be closed or placed, say so plainly; don't hide it.
