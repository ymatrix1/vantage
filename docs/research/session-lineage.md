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

- 506 of 518 sessions are on a non-default branch by the transcript's `gitBranch`, but `file.edited` and `command.ran` events from transcripts carry no `branch` (only the prompt does), so the linker finds the branch only through a scanned worktree. ❓ Unverified on the live store whether this is why many sessions end as provisional items; a follow-up bean tracks it.

## Method

One Node script, read-only, over `~/.claude/projects/**/*.jsonl` (files with mtime in the last 14 days) and `~/.vantage/spool`. Per file it read `sessionId`, `uuid`, `parentUuid`, `isSidechain`, `agentId`, `cwd`, `gitBranch`, `timestamp` and the key names of each line, and printed only counts. Session files are named by their session id; that was checked by comparing line ids with the file name (439 of 518 all equal, 79 carry foreign ids).
