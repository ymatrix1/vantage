# Spec: lifecycle

Every work item sits in exactly one stage. Stages change only on evidence.

```
Asked → Built → Proven → Reviewed → Shipped → Verified
          ↑        │         ↺ fixes,          │
          └────────┘           re-review       └─ regression → new follow-up card (Asked)
         edit after proof
Asked → Parked (explicit user choice)
```

## Stages and gates

| Stage | Enters when | Evidence source |
|---|---|---|
| **Asked** | A deterministic anchor appears: Jira or Linear issue assigned to the user, branch or worktree created, `TodoWrite` item, a commitment message by the user in Slack, Jira, Linear or GitHub. Or an LLM proposes the item from chat and the user confirms. | Anchors, user confirmation |
| **Built** | The first code edit linked to the item exists, uncommitted or committed on its branch. | git, hook events |
| **Proven** | A passing test or data check that exercises the changed code ran **after** the last linked edit. With behaviors defined, progress shows as "N of M proven". | Hook events (`PostToolUse` on Bash), exit codes, output |
| **Reviewed** | A linked PR is approved with all blocking threads resolved. | GitHub |
| **Shipped** | Merged to the default branch **and** deployed (a deploy event exists for the merge commit). For code with no deploy step (libraries, docs), merge alone counts and the card says so. | git, GitHub, CI/CD |
| **Verified** | Post-deploy checks passed and the monitoring window stayed clean. | CI/CD, monitoring, production data checks |

### Verified, in detail

All configured checks must pass:

1. **Post-deploy tests:** smoke or e2e tests against staging or production, run after the deploy.
2. **Production data checks**, for data work: `dbt test` or `dbt build` against prod, pipeline row counts and freshness.
3. **Monitoring window:** no linked alert, error spike or incident for N days (default 2) on the files or services the item touched.

If a repo has no checks configured, the card shows Verified as "not configured" (hollow dot), never green.

## Backward moves and follow-ups

- **Proof expires.** Any linked edit after the latest proof moves the card from Proven or Reviewed back to Built. Shown explicitly, never silently.
- **Reopened PR** moves the card back to Reviewed.
- **Regression after ship.** A linked alert, failed prod check, incident or revert does **not** reopen the card. It:
  - adds a red `regression` flag to the original card, which keeps its history;
  - spawns a follow-up card "Fix: <title>" in Asked, linked to the original.

  Reason: "done" work shouldn't silently come back, and the record of what shipped stays honest.

## Reviewed sub-states

`waiting` → `changes_requested` → `fixing` → `re_review_requested` → `approved`

The card stays in the Reviewed column through the loop to avoid churn; the sub-state shows on the card.

## Skips

A skipped stage shows as a hollow "skipped" dot, never green.

- No PR (direct push to default branch): Reviewed skipped.
- No deploy step: Shipped means merged.
- Data or analysis work can satisfy Proven with a data check instead of a unit test.

## Parked

- Only the user parks an item. Never inferred.
- Parked items raise no flags and can be un-parked.

## Flags

Flags sit on any card, whatever the stage.

| Flag | Trigger | Severity |
|---|---|---|
| `waiting_on_you` | Session waiting on a permission prompt or question (`Notification` hook) | red |
| `ai_decided` | Business rule in the diff not present in the request or approved behaviors | red |
| `collision` | Two active sessions edit the same uncommitted file | red |
| `regression` | Linked alert, error spike, failed prod check, incident or revert after ship | red |
| `unproven_claim` | Session claimed completion with edits and no qualifying proof after the last edit | amber |
| `thrashing` | 3+ consecutive edit → failing command cycles on the same files | amber |
| `forgotten` | Asked or Built with no activity for N days (default 5), or a user commitment with no follow-up | amber |
| `unseen_mention` | Slack, Jira or Linear mention, or GitHub review request, with no reply or reaction from the user | amber; red if the person is blocked |
| `claimed_fixed` | A reply says fixed or done on a review thread, but no later commit touches the commented lines | amber |
| `shipped_unverified` | Deployed, but no post-deploy check ran within N hours (default 24) | amber |

## What counts as proof

See the [proof spec](proof.md): proof types, strength levels (L0 claimed to L4 production), freshness and expiry, weak or fake proof detection, and the `Stop` hook gate. Proven needs a fresh proof at level L1 or higher.
