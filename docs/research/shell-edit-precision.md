# Research: shell-edit detection precision

> **Bean:** `vantage-9bg1`. **Measured:** 2026-10-14 over the author's local Claude Code transcripts, last 14 days. Aggregates only. Command text, paths and repo names stayed outside the repo; the reading script and its scratch output were local and are deleted.

## Question

`detectShellEffects` ([shell.ts](../../packages/core/src/shell.ts)) turns Bash commands into edits (redirects, `tee`, `Set-Content`, `sed -i`, `git apply`) and commits. R1 found that counting edit tools alone misses real work, but the detector was only tested on synthetic commands. How precise is it on real ones?

## Answer

**Before the fix: writes 84% precise, opaque writes 100%, commits 100%. After: writes 100% (30 of 30).** Two false-positive families caused all the errors, and both are fixed. The remaining weakness is recall: about 2.5% of unflagged commands still write files.

| Flag | Sample | Precise before | Precise after |
|---|---|---|---|
| `writes` (named target) | 25 / 30 | 21 of 25 (84%); 9 of 25 also named a junk path | 30 of 30 (100%) |
| `opaqueWrite` | 25 / 25 | 25 of 25 | 25 of 25 on the newly flagged ones |
| `commit` | 25 | 25 of 25 | unchanged; 5 more real commits found |
| Unflagged (recall check) | 25 / 40 | 2 of 25 were real writes missed (8%) | 1 of 40 (2.5%) |

Samples are small (25 to 30 each), so a 100% reads as "no false positive seen", not "none exist". A rule-of-three bound puts the true false-positive rate under about 10% at 95% confidence.

## Data

| Measure | Count |
|---|---|
| Bash `tool_use` commands, last 14 days | 29,998 |
| Flagged `writes` before / after | 6,344 / 4,236 |
| Flagged `opaqueWrite` before / after | 1,264 / 4,646 |
| Flagged `commit` before / after | 1,407 / 1,410 |
| Unflagged commands after | 21,340 |

## Method

1. A local script walked `~/.claude/projects/*/*.jsonl`, kept lines newer than 14 days, collected `tool_use` blocks named `Bash`, and ran `detectShellEffects` on each `command`. It wrote the commands to a scratch file outside the repo and printed only counts.
2. A seeded shuffle drew about 25 commands per stratum: flagged writes, flagged opaque writes, flagged commits, unflagged. Each was labeled by reading a short excerpt around the match. A command counts as precise when it really writes (or commits), whatever the target.
3. After the fix the script ran again on the same 29,998 commands. Every command whose flags changed was classified, and a fresh sample was drawn from the new `writes` and from the newly flagged opaque writes.

## False-positive shapes (before)

| Shape | Effect | Fix |
|---|---|---|
| A `>` inside a quoted string (grep patterns with `->` or `size>N`, sed scripts with `<id>`, echo text) | A write to a junk path | Quoted strings are masked before matching, except a quoted redirect or `tee` target |
| `>=`, `=>`, `->` or `>` in the body of a here-document (a Python or awk script fed to stdin) | A write to a junk path such as `=` | Here-document bodies are removed before matching |
| `sed -i` or `git commit` mentioned only as text inside a quoted string or here-document | A false opaque write or commit (5 and 2 commands) | Same masking |

The first two together accounted for about 2,100 of the 6,344 flagged commands (33%) before the fix. Most of those were real edits made by a script, so they are now reported as opaque writes instead of writes to a wrong path.

## Recall (after)

| Added | Why |
|---|---|
| Scripted file writes (`open(..., "w")`, `write_text`, `writeFileSync`) in a command or its here-document | Agents edit files with inline scripts; this was the largest missed group (3,387 commands, 25 of 25 sampled were real) |
| `git mv` | A rename is a write |

Still missed: `cp`, `mv`, `touch` (179 unflagged commands, 0.8%) and `git checkout -- <file>` reverts. A redirect inside a quoted `bash -c '...'` string is now masked too. Of the path-like targets dropped by the fix, 63 in total, none that were read was a real write, but a real one in that position would be missed.

## Implications

- ⚠️ About half of the flagged `writes` (2,173 of 4,236) only name log, output or data files (`.log`, `.txt`, `.json`, `.bmp`, `/dev/...`). Those are real writes but are not source edits. A work item that treats them as edits will move on scratch output. Follow-up: classify targets by repo membership at ingest, where the working directory is known (done in `vantage-7ouh`, D70).
- Likewise, some `sed -i` runs target helper scripts outside the repo (5 of 25 sampled). The detector cannot tell, because the target is opaque.
- ❓ The labeled sample is small. A larger one would tighten the bounds, but real command text must stay local.
