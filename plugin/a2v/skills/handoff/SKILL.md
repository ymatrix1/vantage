---
name: handoff
description: Write or read a short handoff note so work survives /compact, /clear, closed terminals and the next day. Use when ending a session, before compacting, when switching to another task, or when starting a session and asking "where was I?", "what's the state?", "resume", or "continue".
---

# Handoff

Lost state is the second-biggest pain in agent work: nobody remembers what was committed, what was only discussed, and what's proven. A handoff note fixes that in under a minute.

## Where notes live

`~/.a2v/handoffs/<repo-name>/<YYYY-MM-DD>-<branch>.md`, outside the repo, so nothing private is committed. One note per branch per day; update it instead of creating duplicates.

## Writing a note (end of session, before /compact, before switching)

Gather facts first; don't write from memory alone:

- `git status --short` and `git log --oneline -10` on the current branch;
- the last check that ran and whether it passed after the last edit (see the `prove-it` skill);
- open questions or decisions waiting on the user.

Then write:

```markdown
# <branch> · <date>

**Goal:** one line: what this work is for.

| State | Item |
|---|---|
| Done and proven | ... (with the check that proved it) |
| Built, not proven | ... (what would prove it) |
| Uncommitted | ... (files) |
| Only discussed | ... (ideas with no code yet) |

**Waiting on the user:** questions or decisions, one per line.

**Next step:** the single first thing to do when resuming.

**Resume:** `claude --resume <session-id>` if known.
```

Keep it under 25 lines. Facts only; mark anything unverified.

## Reading a note (start of session, "where was I?")

1. Find the newest note for the current repo and branch (or the repo, if the branch is new).
2. Check it against reality: compare its "Uncommitted" and "Done" rows with `git status` and `git log`. Point out anything that changed since.
3. Report top-down: one line on where things stand, the next step, and anything waiting on the user. Offer to start the next step.

## Example

> **Where you are:** retry queue is built but not proven; one question waits on you.
>
> | State | Item |
> |---|---|
> | Done and proven | Backoff timer (`npm test -- retry` passed, 8 tests) |
> | Built, not proven | Dead-letter handling: no test yet |
> | Only discussed | Metrics for retries |
>
> **Waiting on you:** max retries, 3 or 5?
>
> Next: add a dead-letter test. Start now?
