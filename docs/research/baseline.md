# Research: baseline from local agent logs

> **Bean:** R1 (`vantage-mmum`). **Measured:** 2026-10-14 with DuckDB 1.5.6 (Python package, installed for this run) over the author's local Claude Code and Codex transcripts. Aggregates only; raw data, queries and scratch output stayed outside the repo.

## Question

Before building, how often do the pains in the [PRD](../PRD.md#3-pains) actually happen in the author's own agent work, and do the [boundary rules](../specs/work-item-model.md#boundary-rules) (D25) and [proof levels](../specs/proof.md#strength-levels) (Q3) fit the data?

## Answer

| Rank | Pain | Headline number (last 90 days) |
|---|---|---|
| 1 | P2 Unproven claims | **43.5%** of sessions with edits end with no passing qualifying check after the last edit |
| 2 | P1 Lost state | **17 of 67** live worktrees hold uncommitted tracked changes and were last touched 7+ days ago; **36** more have no upstream branch and are idle 7+ days |
| 3 | P3 Ghost work | **17.8%** of sessions with requests made no edits, no shell writes, no commits and no subagents (8.7% with 3+ requests) |
| 4 | P5 Thrashing | **2.0%** of sessions with edits hit 3+ edit-then-fail cycles on the same file |

Unproven edits are the dominant, measurable pain. Thrashing at a 3-cycle threshold is rare.

## Data

| Source | Window covered | Sessions |
|---|---|---|
| Claude Code (main chain only; subagent files excluded) | 2026-06-25 to 2026-10-14 | 482 total; 461 started in the last 90 days, 182 in the last 30 |
| Codex | 2026 (5 files) | 5 |

The Claude Code history starts on 2026-06-25, so the 90-day window covers almost all of it. Codex has too few sessions to rate; it's reported separately at the end.

## Method

Schema first: key paths and record types were counted on recent files (no content printed) to learn the real shapes. Claude Code lines with `type` = `user` or `assistant` carry `sessionId`, `timestamp`, `cwd`, `gitBranch`, `isSidechain`, `isMeta` and `message.content`. Tool calls are `tool_use` blocks (`name`, `input`); results are `tool_result` blocks with `is_error`. Codex lines are `{type, payload}`; shell work runs through one `exec` custom tool whose input is a script, edits go through `apply_patch` inside it, and exit codes are absent from most outputs (50 of 637).

Query shapes (DuckDB over `read_json(..., format='newline_delimited')` with explicit columns):

1. **Load:** user and assistant lines from `~/.claude/projects/*/*.jsonl`; unnest `message.content`; split into tool calls, tool results and user prompts.
2. **Deduplicate:** resumed and forked sessions repeat lines. Calls are kept once per tool-use id and results once per id (122,418 call rows to 72,521 distinct ids). Without this step every rate was inflated.
3. **User prompt:** a non-meta user line with text that isn't a tool result, a `<...>` system wrapper or an interrupt notice.
4. **Edit:** an `Edit`, `Write`, `MultiEdit` or `NotebookEdit` call, excluding agent scratch, memory and plan files. Worktree paths count as real edits.
5. **Qualifying check** (from the [proof spec](../specs/proof.md#proof-types)): a `Bash` or `PowerShell` command matching a test runner (vitest, jest, pytest, dotnet test, dbt test or build, go test, cargo test, ctest, npm/pnpm/yarn test, and similar), a data check (duckdb, bq query, psql, sqlcmd, sqlite3) or an API check (curl, Invoke-WebRequest). Commands that start with echo, true, exit 0, cat, ls or pwd never qualify. **Strict** counts shell commands only; **broad** also counts MCP SQL query tools.
6. **L1:** a qualifying check after the session's last edit whose result isn't an error. **L2 (approximate):** the passing check's command names the base name or parent folder of a file edited in the session.
7. **Thrash cycle:** edits to a file set, then the shell commands up to the next edit. A cycle counts when it has at least one failing command and (strict) no successful command or (loose) no passing qualifying check. A file is thrashing at 3+ consecutive counted cycles.
8. **Ghost candidate:** a session with user prompts and no edits. The strict version also has no shell writes (`sed -i`, redirection to a source file, `Set-Content`, `Out-File`, `apply_patch`), no `git commit`, `git push` or `gh pr create`, and no subagent.
9. **Mapping:** issue key = a `KEY-123` pattern in the session's branch names or prompt text, after a stop list of common non-ticket prefixes (UTF-8, SHA-256, RFC, ISO, the repo's own R/Q/P/D labels). Branch = a branch value other than main, master, develop, dev, trunk or HEAD. Worktree = the session cwd is under a `worktrees` folder.
10. **Dirty checkouts:** for each distinct session cwd from the last 90 days, read-only `git --no-optional-locks status --porcelain` and `git rev-list --count @{u}..HEAD` at the repo top level. Idle = days since the newest session that used it.

## Results

### Unproven edits (P2, Q3)

| Measure | 30 days | 90 days |
|---|---|---|
| Sessions with edits | 100 | 255 |
| No L1 at session end, strict | 44.0% | 46.3% |
| No L1 at session end, broad | **42.0%** | **43.5%** |
| No qualifying check ran at all after the last edit | 42.0% | 43.5% |
| Never ran any qualifying check in the session | 7.0% | 11.4% |
| Code edits: no L1 (broad) | 39.3% (89 sessions) | 43.1% (239) |
| Docs-only edits (`.md`, `.txt`, `.rst`): no L1 (broad) | 63.6% (11) | 50.0% (16) |
| L2 (approx.) among sessions that reached L1 | 91.4% | 85.4% |

The "no check ran" and "no L1" rows are equal: when a check ran after the last edit it passed. Missing proof is about not checking, not about checks failing.

Proof types among L1 sessions, 90 days (a session can have several): test 113, MCP SQL 32, API 28, shell data check 18.

### Thrash loops (P5)

| Measure | 30 days | 90 days |
|---|---|---|
| Sessions with 3+ cycles, strict | 0 | 0 |
| Sessions with 3+ cycles, loose | 1 (1.0%) | 5 (2.0%) |
| Files thrashing, loose | 1 | 5 |

Distribution of the longest loose run per edit session, 90 days: 0 cycles 115, 1 cycle 107, 2 cycles 28, 3+ cycles 5.

### Ghost candidates (P3, Q2)

| Measure | 30 days | 90 days |
|---|---|---|
| Sessions with user prompts | 172 | 449 |
| Prompts and no edit tool calls | 73 (42.4%) | 196 (43.7%) |
| Strict: also no shell writes, commits or subagents | 29 (16.9%) | 80 (17.8%) |
| Strict and 3+ prompts | 15 (8.7%) | 39 (8.7%) |

Of the 196 raw candidates (90 days), 108 wrote files through the shell and 58 committed. Counting edits only by edit tools misses real work.

### Abandoned and dirty work (P1)

Distinct checkouts used by sessions in the last 90 days: 151 session folders no longer exist (worktrees already removed), 15 aren't git repos, 71 are live (67 worktrees, 4 main checkouts).

| Measure | Worktrees (67) | Main checkouts (4) |
|---|---|---|
| Tracked files modified | 21 | 3 |
| ...and idle 7+ days | **17** | 2 |
| Only untracked files | 12 | 0 |
| No upstream branch | 47 | 3 |
| ...worktree and idle 7+ days | 36 | n/a |
| Commits ahead of upstream | 1 | 0 |

Of all dirty checkouts (tracked or untracked), 30 were idle 7+ days, 29 idle 14+ days and 22 idle 30+ days. The median dirty checkout has 1 changed path.

### Mapping to an anchor (Q1, D25)

| Share of sessions | 30 days, all (182) | 30 days, with edits (100) | 90 days, all (461) | 90 days, with edits (255) |
|---|---|---|---|---|
| Issue key (branch or prompt) | 34.6% | 49.0% | 38.0% | 48.6% |
| ...key in the branch name | 22.0% | 32.0% | 20.8% | 27.1% |
| Branch or worktree, no key | 55.5% | 47.0% | 54.2% | 47.8% |
| Neither | 9.9% | 4.0% | 7.8% | 3.5% |
| Ran in a worktree | 85.2% | 91.0% | 87.9% | 91.8% |

- **130 of 255** edit sessions (90 days) saw more than one non-default branch value. Branches change within a session (the agent creates or switches a branch after starting in a worktree).
- **9** edit sessions (90 days) worked on a default branch with no key and no worktree: the only cases that need rule 4's provisional items.

### Codex

5 sessions, all with edits; 3 ran a qualifying command after the last `apply_patch`. Pass or fail can't be measured: most `exec` outputs carry no exit code. Too few to rate.

## What can't be measured here

- **Real L2:** the approximation matches file names in the command text. True L2 needs import or coverage data, which transcripts don't carry.
- **Pass or fail beyond `is_error`:** a test command that exits 0 with 0 tests collected counts as passing here.
- **Ghost intent:** a session with no edits may be research, review or ops work, not forgotten work. Only a human or a judge can tell.
- **Shell edits** are detected by pattern for the ghost refinement only; the proof and thrash measures count edit tools only.
- **Review rounds and time to first review** belong to R4.

## Implications for the specs

- **Proof gate (Q3, Q11):** a warn-mode gate would fire on about 43% of edit sessions, mostly because no check ran. That's the core pain, so the gate is worth building, but blocking now would be noisy. Keep L1 for v1. L2 looks reachable (85% by the rough proxy) once hooks capture real linkage; re-measure with hook data.
- **Docs-only sessions:** no qualifying check exists for prose. The gate should skip sessions whose edits are only documentation. Proposed as P1 in [DECISIONS](../DECISIONS.md#proposed-pending-confirmation).
- **Boundary rules (Q1, D25):** the rules fit. Over 96% of edit sessions have a key, branch or worktree; rule 4 is needed for about 4%. But half of edit sessions change branch mid-session, so events must take the branch at event time, not the session's first branch. Proposed as P2.
- **Issue keys:** keys appear in prompts about as often as in branch names. Keys found only in prompt text are weaker anchors and need a stop list and the user's tracker prefixes to avoid false matches.
- **Thrashing threshold:** 3 cycles fires on about 2% of edit sessions with the loose definition and never with the strict one. Keep 3, reset only on a passing qualifying check. Proposed as P3.
- **Abandoned work:** "dirty and idle 7+ days" flags 17 worktrees today, and "no upstream and idle 7+ days" flags 36. Both are useful `forgotten` signals for P1.
- **Ghost detection (Q2):** about 1 in 6 prompted sessions is a strict candidate, roughly 0.9 per day. A daily cap is realistic; edit tools alone aren't a good "work happened" signal.

## Open follow-ups

- Re-run these measures on hook-captured events after Phase 1 (true exit codes, test counts, real L2).
- Label a sample of strict ghost candidates to get precision before shipping ghost proposals (Q2).
- Include subagent transcripts: edits made by subagents are invisible to the main-chain counts here.
- Get Codex exit codes from a richer source before rating Codex sessions (R3).
