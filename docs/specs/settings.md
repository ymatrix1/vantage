# Spec: Settings

Where the user sees and controls which engine answers, what it may read, and how much it may run. Everything that leaves the machine is **off by default** (see [privacy](../ARCHITECTURE.md#privacy)).

## Where it lives

- **View:** a Settings tab on the Sources page (`g s`), next to the per-source health list. No new page.
- **Storage:** `~/.vantage/config.toml` (see [operations](operations.md#configuration)). The UI reads and writes that file; it never holds secrets (tokens stay in the OS credential store).
- **API:** `GET /api/settings` and `POST /api/settings` (see [web UI](web-ui.md#api-daemon-to-ui)). Every POST is recorded in `user_actions`.

## Sections

| Section | What the user controls | Default |
|---|---|---|
| **Engines** | Which engine answers each AI-assisted job | Evidence and rules only |
| **Budgets** | Daily runs and fallback order for headless engines | 10 runs a day |
| **Data policy** | Which kinds of content an outside engine may receive | Nothing |
| **Calm** | Digest times, quiet hours, `forgotten` threshold, Focus size | See [operations](operations.md#configuration) |
| **Proof gate** | `off`, `warn` or `block` | `warn` |

Calm and Proof gate already exist; this spec adds the first three.

## Engines

One row per job. Each row shows the current engine, what leaves the machine for that job in one line, and today's usage against its budget.

| Job | Engine choices | Default | Decided by |
|---|---|---|---|
| **Status, stages, flags, proof, scores** | None. Computed in code. | n/a | [D10](../DECISIONS.md#d10-scores-computed-in-code): signals in code |
| **Judgment** (fuzzy yes or no questions) | `rules`, then optionally a small LLM or a decision model | `rules` | Open: Q4, compared in `vantage-ibuz` (R10) |
| **Explain, layers 1 to 3** | None extra: evidence, byproduct capture, in-session command | On | [Explain](explain.md#engine-four-layers) |
| **Explain, layer 4 (headless)** | `claude`, `codex`, in a user-chosen order | **Off** | [Explain](explain.md#engine-four-layers), [D46](../DECISIONS.md#d46-explain-runs-in-layers-headless-is-opt-in) |
| **Classify** (titles, topics, groupings) | `claude -p` with Haiku, through the user's own Claude Code | **Off** | [Classify](classify.md), D100 |
| **Embeddings** | Not offered until Q25 is answered | n/a | Open: Q25 |

Rules:

- **No engine is hard-coded.** The list of choices comes from what is installed and enabled. A choice that is not available shows as unavailable, with the reason.
- **Small fast models by default** for layer 4. The model name is a setting (`engines.explain.model.claude`, `engines.explain.model.codex`), set from what the CLI reports. Haiku was measured in R13 (20 of 20 schema-valid runs, median 52.5 s), so it is the suggested starting value for `claude`.
- **Fallback order** is a list. If an engine errors or hits a limit, the next one runs, then layer 1.
- **Official CLIs only.** The settings never accept a token for a private API (see [Explain](explain.md#engine-four-layers)).

## Data policy

The master switch comes first, then one switch per kind of content. A kind is only offered when its source is connected.

| Key | Meaning | Default |
|---|---|---|
| `data_policy.outside_calls` | Master switch. When off, no engine except local code may run. | `off` |
| `data_policy.allow.code` | Diffs, hunks and commands | `off` |
| `data_policy.allow.transcripts` | Agent prompts and replies | `off` |
| `data_policy.allow.chat` | Slack messages | `off` |
| `data_policy.allow.tickets` | Jira and Linear issue text | `off` |

- A job that needs a kind of content that is off falls back to layer 1 or rules, and says so in its output.
- The view shows, per engine, the **minimum context** it would receive (a hunk, a comment, a command), never a whole transcript.
- The company policy itself is decided in `vantage-h8fv`. Until that is recorded, the defaults above stay and the view says "policy not confirmed".

## Budgets

| Key | Meaning | Default |
|---|---|---|
| `engines.explain.headless.enabled` | Layer 4 on or off | `false` |
| `engines.explain.headless.order` | Engines in fallback order | `["claude", "codex"]` |
| `engines.explain.headless.daily_runs` | Maximum layer 4 runs a day | `10` |
| `engines.judge.engine` | `rules` or a named engine | `rules` |
| `engines.judge.daily_calls` | Maximum judgment calls a day, when an engine is set | `200` |

Usage against each budget shows on the Diagnostics tab (see [web UI](web-ui.md#api-daemon-to-ui)). Hitting a budget is not an error: the job falls back and the tab shows why.

## Classify

`vantage classify` ([spec](classify.md)) is an engine row of its own. It needs three switches, all off by default, and says which one is missing when blocked:

| Key | Meaning | Default |
|---|---|---|
| `engines.classify.enabled` | Allow the job | `false` |
| `data_policy.outside_calls` | The master switch above | `off` |
| `data_policy.allow.transcripts` | The first request of a session is a prompt | `off` |
| `engines.classify.model` | Alias or id passed to `claude --model` | `haiku` |
| `engines.classify.batch_size` | Items per call, 1 to 50 | `20` |
| `engines.classify.daily_calls` | Calls a day; 0 blocks | `50` |
| `engines.classify.timeout_seconds` | Per call, 5 to 600 | `120` |
| `engines.classify.settle_minutes` | Quiet time before an item is classified | `30` |
| `engines.classify.auto_accept` | `off`, `titles` or `all` | `off` |
| `engines.classify.auto_min_confidence` | Minimum confidence for auto-accept | `0.9` |
| `engines.classify.command` | The Claude Code executable | `claude` |

Claude Code already receives the user's data, so this sends nothing to a new party; the switches stay so the choice is explicit. What is sent is fixed by the spec (no commands, no paths, no transcripts beyond one stripped sentence). The settings are read from `config.toml` at the start of each run.

## Checks and states

| State | What the user sees |
|---|---|
| Engine not installed | Greyed row, with the install hint |
| Outside calls off | Engine rows read-only, with "Turn on outside calls to use" |
| Budget used up | Row shows "limit reached, using fallback" |
| Policy not confirmed | Banner on the Data policy section |

## Out of scope

- Choosing the judgment model (Q4) and the embeddings layer (Q25).
- Deciding the company data policy (`vantage-h8fv`).
- Secrets: tokens are never part of this view (see [operations](operations.md#secrets)).
