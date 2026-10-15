# Research: derived sessions

> **Status:** measured 2026-10-14 on one developer machine (Windows, Claude desktop app entrypoint), last 14 days. Counts and rates only: no transcript text, paths, repo names or session ids were copied (see [privacy boundary](../../.agents/rules/privacy-boundary.md)). The read-only script ran outside the repo and its output was deleted.

Question: which sessions are not independent, and which explicit signals say so? Bean `vantage-o3s3`; decisions [D86](../DECISIONS.md#proposed-pending-confirmation) and D87.

## Answer

Two explicit signals exist and one is already free. **79 of 519 sessions (15%) are derived from another session**, found by history copied from the parent. **Sub-agent runs are not separate sessions at all**: every sub-agent file with a session id (570 of 572) carries the parent's session id. Compaction keeps the session id. No parent or fork pointer field exists in transcripts or hook payloads.

## Data

| Measure | Count |
|---|---|
| Transcript files touched in 14 days | 1,090 |
| Top-level session files | 518 (519 distinct session ids) |
| Sub-agent files (`subagents/` folders) | 572 |
| Lines read | 1.17 M |
| Spool files, hook events in the window | 1 file, 98 events (hooks were installed days ago) |

## Signals

| Signal | Sessions it identifies | Parents | Deterministic? | Used? |
|---|---|---|---|---|
| Sub-agent (`isSidechain`, `agentId`, `subagents/` folder) | 572 files, 421 distinct agent ids, in 61 sessions | 59 distinct parent sessions | Yes. Every sub-agent file that carries a session id (570 of 572) names a session that has its own transcript; 406 sit in that session's folder, 164 in another folder | Already grouped by session id. `agentId` is now kept on events for a per-item count |
| History copied from another session (lines at the start of a session file stamped with another `sessionId`) | 79 sessions (15.2% of 519) | 54 distinct parent transcripts; 7 children point to a parent with no transcript in the window | Yes: the copied lines are the parent's own lines (`parentUuid` chain crosses the session id in 80 files) | **Yes** (D86) |
| Chains (a child of a child) | 37 of the 79 carry more than one foreign id | the immediate parent is the last foreign id | Yes | Yes: the linker follows parents to the root |
| `compact_boundary` / `logicalParentUuid` | 129 boundaries in 54 files | none | The session id never changes across a boundary (0 of 129) | Not a signal: compaction is the same session |
| `SessionStart` `source` (`startup`, `resume`, `clear`, `compact`, `fork`) | spool has 3 starts, all `startup` | none | ❓ not measurable yet: hooks are new | Kept on `session.started`; names the kind when present |
| Explicit parent or fork pointer in a transcript line | 0 fields. Key names containing `parent`: `parentUuid`, `logicalParentUuid` only | | | |
| `origin.from` (peer messages) | 356 lines in 45 files | its value matches no session id in the window | ❓ unknown meaning | Not used |
| Same cwd and branch, next session starts within a gap | 87 (5, 30 min), 89 (120 min) of 519 | | No: heuristic | **No**: D87 proposed |

### Parent timing

Of the 72 derived sessions whose parent has a transcript: 45 started while the parent was still active later (overlap, so a fork or a second resume of the same parent), 27 started after the parent ended (22 more than a day later, 4 within a day, 1 within a minute). The hook source is needed to tell resume from fork; without it the kind is `continuation`.

## Heuristic grouping (not implemented)

Same cwd and branch, next session starting within a gap of the previous one's last activity:

| Gap | Matches | Also derived by a signal | Heuristic only | On a non-default branch |
|---|---|---|---|---|
| 5 min | 87 (16.8%) | 68 | 19 (3.7%) | 80 |
| 30 min | 87 | 68 | 19 | 80 |
| 120 min | 89 | 68 | 21 | 81 |

The heuristic finds 68 of the 79 derived sessions (86%) and adds 19 unconfirmed ones (3.7% of all sessions). Without labelled data its precision on those 19 is unknown. It would also group two independent sessions on one long-lived branch, and 506 of 518 sessions sit on a non-default branch anyway, where the branch anchor already groups them.

## Side findings

- 506 of 518 sessions are on a non-default branch by the transcript's `gitBranch`, but `file.edited` and `command.ran` events from transcripts carried no `branch` (only the prompt did), so the linker found the branch only through a scanned worktree. Confirmed on the live store (below) and fixed in `vantage-j9ea` (D92).

## Branch on tool events: before and after

Same copy of the live store (about 32.7 thousand events, 163 sessions, 137 with edits), linked with the code before and after the change; after = the one-shot backfill over the 14-day transcripts, then a link pass. Counts only.

| Measure | Before | After |
|---|---|---|
| Sessions with an edit anchored by branch, issue key or worktree | 12 of 137 (9%) | 129 of 137 (94%) |
| Sessions whose edits are all in a per-session item | 125 | 8 |
| Edit events in a per-session item | 7,790 of 8,097 (96%) | 1,174 of 8,097 (14%) |
| `Session <id>` items | 130 | 33 |
| Branch items | 296 | 361 |
| Issue items | 37 | 48 |
| Worktree items | 4 | 4 |
| All items | 467 | 446 |
| Tool events with a `branch` in the stored payload | 0 | 0 (the branch sits in `event_branches`; 87,493 rows after the backfill, one per tool call seen in the 14-day transcripts) |

❓ The 8 sessions and 1,174 edits still in per-session items are on the default branch, detached, or have no `gitBranch`; the split was not measured. Total items fall only a little (467 to 446) because sessions that were separate rows now share a branch item: that is the intended effect, and it moves 97 rows from untitled `Session <id>` to a named branch or key.

## Task lists, sub-agent runs and forks

Measured 2026-10-14 on the same machine, last 14 days, 521 sessions. Counts only.

| Measure | Count |
|---|---|
| Sessions with a `TodoWrite` call | 0 |
| `TaskCreate`, `TaskUpdate`, `TaskList` calls (the newer task tools) | 5, 8, 1, in 3 sessions |
| `Agent` tool calls | 776 (no `Task` tool name seen) |
| Sub-agent runs named in a parent's tool result | 730 in 119 sessions (median 2, p90 22, max 54 per session) |
| Distinct agent ids in sidechain files | 415 |
| Runs whose result carries duration, tokens and tool count | 42 of 730 (the rest are async: no totals in the result) |
| `Agent` calls with a `description` input | 776 of 776 |
| Derived sessions whose parent transcript is in the window | 75 of 79 |
| Of those, the parent has own lines the child's copy lacks | 61 (81%) |
| Of those, the parent produced lines after the child started | 59 (79%); 16 (21%) did not |
| `SessionStart` sources seen in the spool | 3, all `startup` |

- **Task lists:** `TodoWrite` never appears here, and the task tools are used in 3 of 521 sessions. A `TaskUpdate` names a `taskId` that only the `TaskCreate` result carries, and that result shape was not verified on 5 creates, so only `TodoWrite` (the whole list in each call) is read. ❓ Whether the newer task tools replace `TodoWrite` for most users is unknown from one machine.
- **Sub-agents:** the run's duration and tool count are only complete in the sidechain file, so they come from there. The parent's `description` is capped text and was left out (follow-up bean).
- **Forks:** 59 of 75 derived sessions started while their parent was still producing lines (the history was copied, then both went on), the structural sign of a fork or a second resume of one parent. The hook source that would say `fork` or `resume` is not in the data yet, so no session can be called a fork or a resume with certainty; the count is a hint. This replaces the earlier "45 of 72" reading, which compared only the parent's last timestamp.

## Method

One Node script, read-only, over `~/.claude/projects/**/*.jsonl` (files with mtime in the last 14 days) and `~/.vantage/spool`. Per file it read `sessionId`, `uuid`, `parentUuid`, `isSidechain`, `agentId`, `cwd`, `gitBranch`, `timestamp` and the key names of each line, and printed only counts. Session files are named by their session id; that was checked by comparing line ids with the file name (439 of 518 all equal, 79 carry foreign ids).
