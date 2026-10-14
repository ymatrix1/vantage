---
name: plan-task
description: Turn a request into a short, structured task plan before starting work - Context, Higher Goal, Acceptance Criteria, Out of Scope, Summary of Changes - and use the same structure for the PR description at the end. Use when starting any non-trivial task, when the user asks to "plan", "scope" or "break down" work, or when opening a pull request.
---

# Plan a task

A short plan up front prevents the two classic agent failures: solving the wrong problem, and quietly growing the scope. The same five sections become the PR description, so the plan is checked against the result.

## The template

```markdown
## Context
The problem, why it matters now, and the current state. "Blocked by: none" or what must land first.

## Higher Goal
What this serves beyond the task itself, in one or two lines.

## Acceptance Criteria
- [ ] A verifiable outcome, with how to check it (a test, a command, a measurement)
- [ ] ...

## Out of Scope
What this task deliberately doesn't do, and where it goes instead.

## Summary of Changes
TBD (filled in when done: files changed, tests added, how it was proven)
```

## Steps

1. **Ask before assuming** if the goal, the expected behavior or a limit is unclear. One short question beats a wrong plan.
2. **Write the plan** with the template. Keep it under about 20 lines.
   - Each acceptance criterion is an **outcome you can check**, not a step ("search returns results in under 200 ms", not "add an index").
   - Out of Scope names at least one tempting extra you won't do.
3. **Show the plan** and get a quick OK for anything bigger than a small fix.
4. **Put it where the project tracks work:** the project's task tracker if it has one, otherwise the PR description or the top of the handoff note.
5. **While working:** tick criteria as they're proven (see `prove-it`). Anything new you discover goes into a follow-up, not into this task.
6. **At the end:** fill in Summary of Changes and use the whole template as the PR description, with every criterion ticked or explained.

## Example

> ## Context
> Login checks hit the database on every request; p95 latency is 180 ms. Blocked by: none.
>
> ## Higher Goal
> Make the app feel instant on every page.
>
> ## Acceptance Criteria
> - [ ] p95 of the session check under 50 ms in the load test (`npm run bench:auth`)
> - [ ] Revoked sessions stop working within 1 minute (new test)
>
> ## Out of Scope
> Changing the login page; caching other endpoints.
>
> ## Summary of Changes
> TBD
