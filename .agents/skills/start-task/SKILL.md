---
name: start-task
description: Standard procedure to start any task in Vantage. Finds or creates the bean, creates a branch or worktree, writes the structured plan, and checks the relevant docs.
---

# Start a task

1. **Sync:** `git fetch origin`.
2. **Read the docs:** the ROADMAP phase the task belongs to, and every spec it touches (`docs/specs/*.md`). Check `docs/DECISIONS.md` and `docs/OPEN-QUESTIONS.md` for anything that constrains it.
3. **Find or create the bean:** `beans list --ready` (or `beans list --json`). If none exists, `beans create "Title" -t task -s in-progress --parent <epic> --blocked-by <id> -d ...`. If it exists, `beans update <id> -s in-progress`.
4. **Branch or worktree** from `origin/main`:
   ```bash
   git worktree add <path> -b <type>/<slug> origin/main
   ```
   Small doc edits during the planning phase may stay on `main`.
5. **Write the plan in the bean body:**
   - **Context:** root problem, motivation, current state. "Blocked by: none" if nothing blocks it.
   - **Higher Goal:** why it matters for the product.
   - **Acceptance Criteria:** verifiable checkboxes (`- [ ]`).
   - **Out of Scope:** explicit boundaries.
   - **Summary of Changes:** filled in when done.
6. **Baseline:** once code exists, run the test suite before changing anything and note the result.
