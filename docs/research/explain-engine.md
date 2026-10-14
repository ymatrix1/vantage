# Research: Explain engine feasibility

> **Bean:** R13 (`vantage-2vum`). **Checked:** 2026-10-14, Claude Code 2.1.146 on Windows 11, Team plan login. Codex CLI not installed on this machine. All model input was a **synthetic** work item; no real code, transcripts or tickets were sent.

## Question

Can Explain (layers 3 and 4 of the [Explain spec](../specs/explain.md#engine-four-layers)) run on the tools the user already pays for, fast and reliably enough, and returning typed blocks that cite evidence?

## Answer

Yes for Claude, with two design changes. `claude -p --json-schema` returned schema-valid blocks in **20 of 20** runs. Every run cited only ids from the input, apart from one id that wasn't evidence (see [Results](#results)). It is slow (median **52.5 s**), and the model **does not keep status or tree shape stable** between runs. Status and tree structure must therefore come from Vantage (layer 1), and the model should only write the text.

Codex was not measured. Layer 3 was checked against the docs but not run end to end.

## Method

| Item | Detail |
|---|---|
| Input | Synthetic work item `wi_demo_01` (title, stage `Built`, 2 flags, 3 behaviors, 2 proofs, 1 review thread, 4 events, 1 decision; 15 evidence ids). About 2 KB of JSON |
| Schema | JSON Schema for `headline`, `scr`, `tree` (recursive nodes), `missing`, `followups`; every claim has an `evidence` array (min 1) |
| Command | `claude -p --model haiku --output-format json --json-schema <schema> --tools "" --strict-mcp-config --setting-sources "" --no-session-persistence --system-prompt <short rules>`, facts on stdin, run from an empty temp folder |
| Model | `claude-haiku-4-5-20251001` (from `modelUsage`) |
| Runs | **20**, sequential (1 trial + 19). Plus 2 failure probes (bad model name, invalid schema) |
| Checks | Wall time, `duration_api_ms`, exit code, `is_error`, `structured_output` present, `jsonschema.validate`, every cited id in the input id set, headline word count |

The scripts and raw outputs stay in a temp folder outside the repo.

## Results

| Metric | Value (n = 20) |
|---|---|
| Success (exit 0, `is_error: false`) | 20 / 20 |
| `structured_output` present and schema-valid | 20 / 20 |
| Wall latency p50 / p95 (min–max) | 52.5 s / 76.2 s (34.9–104.2 s) |
| API time p50 / p95 | 48.6 s / 73.7 s |
| Turns per run | 2–3 (structured output adds a tool round trip) |
| Output tokens p50 | 5,494 (final JSON turn about 170–260 tokens) |
| Reported cost (`total_cost_usd`, API-equivalent; billed to plan limits, not money) | $0.83 total, about $0.04 a run |
| Evidence ids cited | 640 |
| Cited ids not in the input | 0 |
| Cited ids that aren't evidence | 8, all the target's own id (`wi_demo_01`), in 8 runs |
| Headline ≤ 15 words | 20 / 20 (max 11) |
| Headline status chosen by model | `waiting` 9, `at_risk` 8, `blocked` 3 |
| Top-level tree branches | 2 (5 runs), 3 (6), 4 (7), 5 (2); none grouped by A2V step |
| `missing.gate_or_flag` | Free text, not a gate or flag name |

**Failure probes**

| Case | Behavior |
|---|---|
| Unknown model | Exit 1, `is_error: true`, `api_error_status: 404`, a readable `result` message |
| Invalid schema `{"type":"bogus"}` | Accepted silently: exit 0, plain-text answer, no error. The docs say an invalid schema exits with an error, but it didn't here |
| Not logged in | Exit 1, `is_error: true`, `result: "Not logged in · Please run /login"`, 0 tokens |
| Subscription limit hit | **Not tested.** No limit was reached |

**Environment finding:** a `claude -p` spawned from inside a Claude desktop-app session inherited host variables and reported "Not logged in" until the standalone CLI was logged in with `claude auth login`. `--bare` mode never reads the subscription login and needs `ANTHROPIC_API_KEY` ([headless docs](https://code.claude.com/docs/en/headless)), so Vantage must not use `--bare`. It must isolate runs with `--tools ""`, `--strict-mcp-config`, `--setting-sources ""` and an empty working folder.

## Vendor policy (as of 2026-10-14)

| Vendor | Finding | Source |
|---|---|---|
| Anthropic | The separate Agent SDK billing announced for June 15, 2026 was **paused**. Agent SDK, `claude -p` and third-party app usage "still draw from your subscription limits" (help-center update dated June 15, 2026) | [support.claude.com 15036540](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) |
| Anthropic | Since Oct 7, 2026, Max and Team plans include monthly API credits (Max 5x $100, Max 20x $200, Team $20 or $100 a seat, pooled up to $500; Pro not eligible). They apply only when `-p` runs with an API key. Runs logged in with the plan use plan limits, not credits | [support.claude.com 15036540](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan), [support.claude.com 17154008](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-and-team-plans) |
| Anthropic | Whether `-p` shares the same 5-hour and weekly buckets as interactive use: not stated explicitly. Behavior at a limit in print mode: not documented on the pages checked | — |
| OpenAI | `codex exec` supports `--output-schema` and `--json` (JSONL events). The docs recommend API-key auth (`CODEX_API_KEY`) for automation; a ChatGPT login works on trusted machines "using ChatGPT/Codex rate limits" | [learn.chatgpt.com non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) |
| OpenAI | Codex is included in paid ChatGPT plans. Exec limits and any change to billing for non-interactive use: **not confirmed** | [developers.openai.com/codex/pricing](https://developers.openai.com/codex/pricing) |

## Layer 3: in-session Explain

Checked against the docs, not built.

| Tool | Mechanism | Limits |
|---|---|---|
| Claude Code | A skill (`skills/vantage-explain/SKILL.md`) in a Vantage plugin, invoked as `/vantage:vantage-explain <target>`, plus the plugin's MCP server (`.mcp.json` in the plugin) with `get_facts(target)` and `put_blocks(target, blocks)` tools. Vantage validates the blocks on `put_blocks`. Commands and skills are merged ([skills docs](https://code.claude.com/docs/en/skills)) | MCP output above 10,000 tokens warns, capped at 25,000 by default (`MAX_MCP_OUTPUT_TOKENS`). A per-server `timeout` overrides `MCP_TOOL_TIMEOUT`. `allowed-tools` only pre-approves; it doesn't restrict ([MCP docs](https://code.claude.com/docs/en/mcp)) |
| Codex | Custom prompts are **deprecated** in favor of skills ([custom prompts](https://developers.openai.com/codex/custom-prompts)). The MCP server goes under `[mcp_servers]` in `config.toml`, with `enabled_tools`, `tool_timeout_sec` (default 60) and `startup_timeout_sec` (default 10) ([Codex MCP](https://developers.openai.com/codex/mcp)) | The Codex skill location and MCP output-size limit were not confirmed |

Layer 3 has no schema flag. Validity depends on Vantage checking the `put_blocks` input against the same schema and returning errors so the agent can retry within the session.

## Implications for the design

1. **The model never sets status or tree shape.** In this test the model picked three different headline statuses for identical facts and never grouped the tree by A2V step. Vantage builds the status tree and headline status (layer 1). The model receives node ids and returns labels and narrative for them. This follows the spec's core rule ("the model explains, it never decides status") more strictly than the current block schema allows.
2. **Constrain ids in the schema.** Put the input's evidence ids in an `enum` for `evidence` items, and the flag and gate names in an `enum` for `missing.gate_or_flag`. This removes the target-id and free-text problems at the source. Vantage still drops claims without evidence.
3. **Validate the schema in Vantage.** The CLI accepted an invalid schema silently, so Vantage checks its own schema at build time and validates every output itself.
4. **Layer 4 is a background job, not a click-and-wait.** A ~50 s median suits "Explain in background, notify when ready". Layer 1 shows instantly, as the spec already says.
5. **Budget unit.** About 5.5k output tokens per Haiku run. The default of 10 runs a day is small next to normal interactive use, but limit-hit behavior is untested, so treat any `is_error: true` as "fall back".

## Recommendation for layers 3 and 4

| Setting | Recommendation |
|---|---|
| Layer 3 | On with the plugin. Skill plus MCP `get_facts` and `put_blocks`; Vantage validates and stores |
| Layer 4 | Off by default (D46 stands). When on: `claude -p --model haiku` with the isolation flags above, run as a background job, timeout 120 s |
| Budget | 10 runs a day default; cache by evidence ids (spec) |
| Fallback order | Layer 3 if a session is open → layer 4 with the user's first agent → second agent → layer 1. Any nonzero exit, `is_error: true`, timeout or failed validation counts as failure. The spec's "retry once" applies only to validation failures |
| Never | `--bare` (no subscription), private APIs, tools or MCP inside the headless run |

## Follow-ups

- Measure `codex exec --output-schema` (same item and schema, about 20 runs) once Codex is installed. Tracked in the follow-up bean.
- Observe `claude -p` behavior at a plan limit (error text, exit code) when it happens naturally; don't burn limits to force it.
- Build a layer 3 prototype (skill plus MCP) and measure in-session validity and latency.
- Re-test with the id `enum` schema and Vantage-built tree to confirm the labels-only approach keeps validity at 20/20.
