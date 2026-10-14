---
name: phase-plan
description: Turn a Vantage ROADMAP phase into an epic bean with child beans, dependencies and acceptance criteria. Use when starting work on a phase.
---

# Phase plan

1. **Read** the phase in `docs/ROADMAP.md` (scope and exit criterion) and every spec it touches.
2. **Create the epic:** `beans create "Phase <N>: <name>" -t epic -s todo -d ...` with the structured body (Context, Higher Goal, Acceptance Criteria, Out of Scope, Summary of Changes). The exit criterion becomes its acceptance criteria.
3. **Create child beans** (`-t task` or `-t feature`, `--parent <epic>`), one per deliverable in the phase:
   - Each acceptance criterion is an outcome with a way to verify it (a command, a test, or a measurement).
   - Add `--blocked-by` for real dependencies only, so `beans list --ready` shows what can run in parallel.
4. **Check:** every ROADMAP deliverable maps to exactly one bean, and nothing extra is added. Missing scope goes back to the ROADMAP first, with the user's approval.
5. **Add a "Parallel lanes" table** to the phase in `docs/ROADMAP.md` (lane, beans, blocked by) that matches the bean links.
