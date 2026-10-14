# Spec: Explain

> **Status:** draft. Mockups: [docs/mockups/visual.html](../mockups/visual.html#explain).

Explain is a quick action that turns Vantage's evidence into a short, top-down, interactive explanation for someone with little time. It uses the agent the user already has connected (Claude Code, Codex).

**Core rule: the model explains, it never decides status.** Stages, flags, proof and counts come from Vantage's evidence. The model only writes the narrative, groups items and drafts diagrams, and every claim must point at evidence.

## Triggers

- Key `e` or an "Explain" button on any dot, item, project, PR or week.
- `vantage explain <target>` from the terminal.
- Always user-initiated; never automatic.

## Engine

- Runs the user's connected agent headless, for example `claude -p` with JSON output and a schema (Codex as an alternative). No new API keys; it uses the user's existing subscription.
- Uses a small, fast model by default; deep dives may use a larger one.
- Gated by the data policy setting (decision bean `vantage-h8fv`): Slack and tracker content are off by default.

## Input

Only Vantage's structured facts for the target:

- stage, sub-state, flags, proofs (type, level, freshness), review threads;
- short event summaries (one line each), decisions, behaviors;
- for "why" trees: ticket text and the user's own requests, when allowed.

Never whole transcripts. Code only when the user asks for a diagram of how something works.

## Output: typed blocks

The model returns JSON blocks; Vantage draws them with its own components. Generated content never runs as code.

| Block | Content | Rule |
|---|---|---|
| `headline` | One answer-first sentence and a status | About 15 words or fewer |
| `scr` | Situation, Complication, Resolution | Situation is facts only; Resolution names next steps with time estimates |
| `tree` | An issue tree (see below) | MECE, checked by Vantage |
| `missing` | What blocks each step | Each maps to a gate or flag |
| `diagram` | Nodes and edges (flow, components, before and after) | Rendered by Vantage |
| `example` | A concrete case, such as a Given/When/Then with sample data | Taken from proof output when possible |
| `followups` | Up to 4 next questions | Each becomes a button |

Every claim carries one or more evidence ids (event, proof, PR, decision). **A claim without evidence is dropped and the block shows "unsupported".**

## Issue trees and progressive disclosure

Explain is built around an expandable issue tree, read left to right like a consulting logic tree:

- **Starts collapsed:** the question and its first branches only. Click a node to open one level; click a leaf to see its evidence. Collapsed nodes show how many children they hold ("+3").
- **Status stripes roll up:** each node carries the worst status of its children, so a collapsed tree still shows where the problem is.
- **MECE is enforced silently:** Vantage checks that children don't overlap and that, together, they cover everything under their parent (for status trees, every open item appears exactly once). If the check fails, Vantage asks the model to regroup. The user never sees the check.

Two trees per target:

| Tree | Question | Built from | Lifecycle |
|---|---|---|---|
| **Why** | Why are we doing this? (problem, impact, goal, options considered) | Ticket, the user's requests, decisions | Drafted at Asked, confirmed by the user, then frozen as the record of intent |
| **Status** | Where does it stand? (A2V steps, then behaviors and proof) | Vantage evidence only; the model phrases labels | Live; updates as evidence arrives |

The same pattern works at every level: item, project, week (an executive summary).

## Depth and audience

| Depth | Shows |
|---|---|
| 30 seconds | Headline and 3 bullets |
| 2 minutes | Headline, SCR, first level of the tree, what's missing |
| Deep dive | Full tree, diagrams, examples, history |

| Audience | Style |
|---|---|
| Me | Technical, file and command names allowed |
| Manager | No jargon, impact and dates first |
| Standup | Three lines: done, doing, blocked |

## Freshness and sharing

- Results are cached with an "as of" time and the evidence ids they used.
- New evidence on the target marks the explanation stale and offers to regenerate.
- "Copy for Slack" and "Export" run only on the user's click.

## Failure modes

| Failure | Behavior |
|---|---|
| Agent not available | Show the plain status tree built from evidence, without narrative |
| Invalid JSON or schema | Retry once, then show the plain tree |
| MECE check fails twice | Show the status tree grouped by A2V step (always MECE by construction) |
| Unsupported claims | Dropped and marked |
