---
name: prove-it
description: Prove a change works before calling it done - run a check that exercises the changed code after the last edit, show the command and result, and state its proof level. Use before saying "done", "fixed", "works" or "optimized", and whenever asked to verify, test or confirm a change.
---

# Prove it

"Done" means a real check passed after your last edit. Saying it works is not proof.

## Steps

1. **List what changed:** the files you edited since the last passing check.
2. **Pick the strongest check you can run:**

   | Change | Check |
   |---|---|
   | Code with tests | The test runner, filtered to tests that touch the changed files |
   | Data, SQL, pipelines | A query with an expected result (row count, value, empty set) |
   | API or service | A request with an expected status and body |
   | UI | A screenshot or a short description of what you saw, after the change |
   | Performance | Before and after numbers with the same setup |
   | Docs only | A link or format checker if the project has one; otherwise report **Not proven: no docs check** |

3. **Run it after the last edit.** If you edit again, the proof expires: run it again.
4. **Read the result, don't trust the exit code alone.** Fail if 0 tests ran, all were skipped, or the command can't fail (`echo`, `true`). Check that the tool actually covered the changed files: for example, a checker that scans only tracked files misses new, untracked ones.
5. **Report it** in one block:

   > **Proof:** `npm test -- billing` passed, 12 tests, after the last edit to `billing.ts` (level: L2 linked).

## Proof levels

| Level | Name | Meaning |
|---|---|---|
| L0 | Claimed | Only said it works. Not proof; say so. |
| L1 | Ran | A real check passed after the last edit. |
| L2 | Linked | That check exercises the changed code. For docs, a checker that read the changed files counts. |
| L3 | Behavior | The check matches a specific expected behavior. |
| L4 | Production | It passed after deploy. |

Aim for **L2 Linked**. State the level you reached, for example "(level: L2 linked)".

## When you can't prove it

Say so plainly, with the reason and what would prove it:

> **Not proven:** no test covers `retry.ts`, and I can't reach the staging API. To prove it: add a test for the 3-retry case, or run `curl https://staging…/health` from a machine with access.

Never imply a check passed when it didn't run.
