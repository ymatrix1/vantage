# Spec: Classify

An opt-in job that asks the user's own Claude Code (`claude -p`, Haiku) to suggest titles, topics and groupings for work items. The model writes text only; status, stage, proof and flags stay evidence-only ([D57](../DECISIONS.md#d57-vantage-owns-status-and-tree-shape-the-model-writes-text-only)). Decisions: D98, D99, D100 (proposed).

## Why

Hundreds of items had weak titles and no grouping, and there is no labelled data to tune rules. Accepting one suggestion at a time is not workable, so every suggestion can be accepted in bulk and every bulk action has one undo.

## Switches

All off by default. A run starts only when all hold (see [settings](settings.md#classify)):

| Key | Needed |
|---|---|
| `engines.classify.enabled` | `true` |
| `data_policy.outside_calls` | `true` |
| `data_policy.allow.transcripts` | `true` (the first request is a prompt) |
| `engines.classify.daily_calls` | above 0 |

Claude Code already receives the user's data, so no new party sees it; the switches stay so the choice is explicit and visible. A blocked run names the missing switches.

## What is sent

Only these fields per item, built by `payloadItem` in `packages/core/src/classify.ts`:

| Field | Rule |
|---|---|
| `id` | Opaque per batch (`i1`, `i2`, …). Item keys never leave: a worktree key holds a path |
| `repo`, `branch` | Folder name; branch as is (80 characters) |
| `request` | First sentence of the first request, at most 300 characters, stripped of URLs, emails, paths, key=value credentials and token-like runs |
| `files` | Up to 10 distinct base names; never paths |
| `sessions`, `edits`, `proof` | Counts and the proof state word |
| `title` | The current title |

Never sent: commands, transcripts beyond that one sentence, paths, diffs, ticket or chat text. A test builds a payload from a fixture full of secrets, paths and commands and asserts none appears in what the fake `claude` receives.

## Commands

| Command | Does |
|---|---|
| `vantage classify --dry-run [--sample N] [--json]` | Prints items, calls, payload size, a sample of the exact message and the command. Calls nothing, writes nothing, needs no daemon |
| `vantage classify` | Starts the background job in the daemon and shows progress |
| `vantage classify status` | Counts, calls today, auto-accept mode |
| `vantage classify accept [--all] [--min-confidence 0.8] [--kind titles\|topics\|groups] [--repo NAME] [--yes]` | Previews, asks, applies as one batch. Default threshold 0.8; `--all` drops it |
| `vantage classify dismiss …` | Same filters |
| `vantage classify undo [--batch ID]` | Reverts the last open batch, or the named one |
| `vantage classify report [--json]` | Agreement report (below) |

## The job

- Runs in the daemon, never inside ingest. Idle until started (the CLI or the page); not triggered by events.
- An item is classified only after 30 minutes without activity (`settle_minutes`), and only when it has a request or an edited file.
- Batches of about 20 (`batch_size`), 2 calls in flight at most, a timeout per call (default 120 s; R13 median was 52 s, p95 76 s).
- Results are cached by content hash (repo, branch, request, files, prompt version). Counts and the current title are not in the hash, so accepting a title or a longer session does not trigger a rerun.
- Daily cap `daily_calls` (default 50), counted in `classify_calls`. The cap cuts the run short and says so.
- A failed call, a timeout, `is_error` or output that does not validate gives no suggestion and is not cached. Two failures in a row stop the run (a plan limit or logout will not fix itself). Failures are counted, never shown as data.

## The call

```
claude -p --model haiku --output-format json --json-schema <schema> --tools "" --strict-mcp-config
       --setting-sources "" --no-session-persistence --system-prompt <fixed text>
```

Prompt on stdin, an empty temp folder named `vantage-classify-*`, a timeout, never `--bare` (it ignores the subscription login; [research](../research/explain-engine.md)). It uses the user's own Claude Code and plan limits.

### The skip guard

A `claude -p` run is itself a Claude Code session, and Vantage's hooks would record it. Three layers keep it out:

1. The child environment has `VANTAGE_SKIP=1`; the Node hook (`packages/hooks/src/bin.ts`) and the native hook (`packages/hooks-native`) exit 0 without reading or writing when it is set (anything but empty or `0`).
2. `--setting-sources ""` loads none of the user's settings, so no hook is registered in the child.
3. Ingestion drops transcripts and hook events whose location holds `vantage-classify-`.

Tests: both hooks (parity suite for the native one), and a run with a fake `claude` that fires the hook and writes a transcript produces no events and no items.

## Output

Validated by Vantage, not trusted to the CLI (the CLI once accepted an invalid schema silently). Per item: `id` (an enum of the batch ids), `title` (at most 60), `topic` (at most 40), `kind` (`feature`, `bugfix`, `docs`, `refactor`, `research`, `chore`, `question`), `same_as` (other ids in the batch, each with a 0 to 1 confidence), `confidence` (0 to 1), `reason` (at most 120). An item that does not validate is dropped; the rest of the batch is kept. Other fields (`status`, `stage`, `proof`, `flags`) are never read.

## Storage

Migration 10: `suggestions` (item, kind `title`/`topic`/`group`, payload, model, prompt hash, content hash, confidence, status `suggested`/`accepted`/`dismissed`/`undone`, `run_id`, `batch_id`, timestamps), `suggestion_batches` (id, action, filter, counts, undone_at) and `classify_calls`.

| Accepting | Effect |
|---|---|
| A title | Sets the item's display title, `title_source = classifier`. The stage pass keeps it. Never for an `issue:`, `branch:` or `worktree:` item (those get no title suggestion) |
| A topic | Stored with its kind; read for grouping |
| A group | Adds `method = inferred` links from the other item's events to the older item. Shown in the trace, undoable. They never feed the stage machine, the Stop gate or the status line, so stage and proof do not change |

## Bulk accept

Everything goes through preview, then apply:

- `POST /api/classify/preview` returns counts per kind, a sample and a token (a hash of the exact selection and action). `POST /api/classify/apply` needs that token and answers 409 if the selection changed, so nothing is applied unseen.
- Filters: all, confidence threshold, kind, repo. Same filters for dismiss.
- Each apply is one batch with one **Undo this batch**: titles go back to what they replaced (unless the title changed since), groups lose their inferred links, dismissed rows become open again.
- Row-level accept and dismiss (`/decide`) are one-row batches.
- Auto-accept (`auto_accept = "off" | "titles" | "all"`, default `off`, with `auto_min_confidence`, default 0.9) runs at the end of a run as an `auto_accept` batch, reported in the status, the CLI and the page, and undoable. With it off nothing is ever applied silently.

## API

`/api/classify/*` (a new file, `packages/daemon/src/classify-api.ts`). The only routes that accept POST; the same Host, Origin and token checks run first and the body is capped at 64 KB. `GET status`, `suggestions`, `batches`, `report`, `dry-run`; `POST run`, `preview`, `apply`, `decide`, `undo`.

## Page

`packages/ui/src/lib/Suggestions.svelte`, self-contained. Mount it above the Track list: `<Suggestions onchange={reload} />`. A bar with counts, **Accept all…** (preview with confidence and kind pickers, then Confirm), **Review** (rows with Accept and Dismiss), **Dismiss all…**, **Undo this batch**, **Classify now** and the job's progress.

## Evaluation

`vantage classify report` and a section of `vantage stats`: for each kind and confidence band (`<0.5`, `0.5-0.8`, `>=0.8`), totals, accepted, dismissed, and agreement with the deterministic anchors. Aggregates only: no titles, keys or repo names.

| Kind | Anchor check |
|---|---|
| group | Agree when the two items share an issue key or branch name, or a session of one derives from a session of the other; disagree when both are anchored by different ones; otherwise no anchor |
| topic | The suggested kind against the branch prefix (`feat/`, `fix/`, `docs/`, …); no anchor when the branch says nothing |
| title | No deterministic anchor; only accept and dismiss rates |

## Out of scope

Codex or other engines, embeddings, changing status from model output, classifying on every event.
