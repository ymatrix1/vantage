# Spec: proof

Proof is what moves a card to **Proven** (and, after deploy, **Verified**). It's the heart of "evidence over claims", so it gets its own rules.

## What proof is

A **proof** is a record of a check that actually ran, captured by Vantage, showing that a change or a behavior works. What an agent *says* is never proof.

## Proof types

| Type | Example | Passes when |
|---|---|---|
| `test` | `vitest`, `pytest`, `dotnet test`, `dbt test` | Exit 0, **more than 0 tests ran**, 0 failed |
| `data_check` | A SQL query with an expected result (`duckdb`, `bq query`, `psql`, `sqlcmd`) | Exit 0 and the result matches the stated expectation (row count, value, empty set) |
| `api_check` | `curl` against a local or staging endpoint | Expected status code and body condition |
| `visual` | Screenshot of the running app, before and after | Captured after the last edit; the user confirms the behavior on sight |
| `benchmark` | Before and after timings | Same setup both times; the improvement claimed is within the measured numbers |
| `prod_check` | Post-deploy smoke test, `dbt build` on prod, monitoring window | Defined in [lifecycle](lifecycle.md#verified-in-detail); feeds Verified, not Proven |
| `manual` | The user tried it by hand | The user marks it; always shown as `manual`, the weakest type |

## Strength levels

Each proof shows a level, so weak proof is visible instead of hidden.

| Level | Name | Meaning |
|---|---|---|
| L0 | claimed | Agent text only. **Not proof**; it raises `unproven_claim`. |
| L1 | ran | A qualifying check passed after the last linked edit. |
| L2 | linked | L1, and the check touches the changed code: the command names a changed path, a test imports a changed module, or coverage hits changed lines. |
| L3 | behavior | L2, and the check maps to a specific behavior (Given/When/Then) on the item. |
| L4 | production | A `prod_check` passed after deploy. |

Proven needs at least L1 for v1. The target is L2 by default once R1 data shows it's practical (open question Q3).

## Where proof comes from (trust order)

1. **Captured by hooks:** Vantage records the command, exit code, timing and output excerpt itself (`PostToolUse` on Bash). Most trusted.
2. **Submitted by an agent through Vantage's MCP tools:** allowed only as a *reference* to a run Vantage already captured (for example "run 812 proves behavior 3"). An agent can't create proof out of text.
3. **Marked by the user:** `manual` or `visual` confirmation.

## The proof record

| Field | Notes |
|---|---|
| id, item, behavior (optional) | |
| type, level, source | source = `hook`, `agent_ref`, `user` |
| command, working directory | |
| exit code, started, finished | |
| result summary | Tests run, passed, failed, skipped; rows returned; status code |
| output excerpt | Capped in size, stored locally only |
| artifacts | Screenshot path, query result sample |
| **code fingerprint** | Hash of the linked files' content when the check ran |

## Freshness

- A proof is **fresh** while the code fingerprint matches the current content of the files it covers.
- Any later edit to those files **expires** it. Phase 1 derives the fingerprint from the item's code-edit events, since file content is not captured, so any later linked code edit expires every fresh proof; documentation edits do not (D71). The card drops back from Proven to Built and the proof shows as "expired" (struck through), never deleted.
- Expiry is per behavior: an edit only expires proofs whose files changed.

## Weak or fake proof detection

These never count as passing, even with exit 0:

- 0 tests collected or run, or all tests skipped.
- A test file changed in the same session only to delete or weaken assertions (shown as a warning on the proof).
- Commands that can't fail (`echo`, `true`, `exit 0`) or that only print.
- A runner filtered to tests unrelated to the changed files (shown as L1, not L2).

## Recognizing the command

A shell command is split into its simple commands at `&&`, `||`, `;`, `|` and newlines, but never inside quotes, backticks or `$(...)`, after a backslash, or in a here-document body (`splitCommandSegments`, shared with the shell write detection). Each segment is read from its first word: leading `VAR=x`, `time`, `env` and `nohup` are skipped, `cd x &&` is its own segment, and the rest is matched against the runner allowlist. A segment that starts with a read-only command (`grep`, `rg`, `cat`, `head`, `tail`, `ls`, `find`, `echo`, `sed`, `git log` and similar) is never a check, even when its arguments name a runner: `grep -n "check_docs\|unittest" f` is a search, not a test run. This is a bug fix to how D71's allowlist is applied, not a change to it.

## Failed proof

- A failing check is recorded too, with a red badge on the behavior.
- Repeated failures after edits feed the `thrashing` flag.

## The gate

On the Claude Code `Stop` hook, when the session edited linked files:

- If there's no fresh proof at L1 or more: **warn mode** exits 0 with JSON `{"systemMessage": "..."}`, which the user sees and Claude doesn't, and raises `unproven_claim`. **Block mode** exits 2 with the message on stderr, which Claude receives as its next instruction.
- Block only when the input's `stop_hook_active` is false, so the gate never loops; Claude Code also caps Stop-hook continuations at 8 in a row.
- Never exit 1: Claude Code treats it as a hook error, not a decision. Semantics from research [R2](../research/claude-code-hooks.md) (decision D60).
- **Phase 1 implementation (D73):** one command appends `session.stopped` to the spool and then runs the gate, which reads the daemon's derived tables read-only. It warns when the session has a code edit and a linked item (past Asked) with proof status `none`, `expired`, `failed` or `weak`. It is silent for docs-only sessions (D53), when `stop_hook_active` is true, when the daemon store is missing or unreadable, and when mode is `off`. State can lag the last edits by one daemon pass (30 seconds). `block` is parsed but not wired: it renders as warn until Q11 is answered.
- The message is specific: "You changed `billing.ts`. Behaviors 2 and 3 have no proof after this edit. Run a test or data check that covers them."

## UX

- **Item page, Proof section:** one row per behavior with its badge (level and type), last run time, and command. Expand a row to see the result summary, output excerpt or screenshot. Expired and failed proofs stay visible in a history list.
- **Actions:** "Ask for proof" (creates a prompt for the session that owns the item); "Mark verified by hand" (`manual`).
- **Track filters:** `unproven`, `expired proof`, `failed proof`, `weak proof (L1 only)`.
- **Focus digest:** "2 items lost their proof today" when edits expire proof.

## Privacy

Output excerpts and screenshots stay in `~/.vantage/`. They are never sent anywhere unless the user turns on a feature that needs it (see [privacy boundary](../../.agents/rules/privacy-boundary.md)).
