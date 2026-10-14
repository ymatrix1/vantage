# Spec: decision log

> **Status:** draft.

Every decision about a piece of work, made by an AI agent or a person, is recorded in one place and readable at a glance. AI decisions are never silent: they appear as *proposed* until a person approves or changes them.

## What counts as a decision

A choice between options that shapes the work and that someone could reasonably have chosen differently:

- technical choices ("use Redis for the cache", "skip the migration for now");
- business rules (retry limits, grace periods, pricing, permissions);
- scope ("leave CSV export out of this PR");
- process ("ship without review", "park this").

Not decisions: routine steps with no real alternative (running tests, formatting, renaming a variable).

## The decision record

Same five fields the project uses for its own decisions (D30), plus who and status:

| Field | Meaning |
|---|---|
| **Context** | The situation that forced a choice |
| **Decision** | What was chosen, precisely |
| **Why** | The stated or inferred reasoning |
| **Alternatives** | Other options mentioned or considered |
| **Impact** | What it changes or commits to |
| **Who** | `ai` (which agent and session) or a person |
| **Status** | `proposed`, `approved`, `changed`, `reverted`, `superseded` |
| **Evidence** | Links to the transcript line, diff hunk, PR comment, message or Vantage action |

Fields the source doesn't state are left blank and marked "not stated", never invented.

## Sources

| Source | Who | Detected from |
|---|---|---|
| Agent transcripts | AI | Choice statements ("I'll use…", "decided to…", "instead of…"), plan approvals, tool calls that change direction |
| Diffs | AI | The `ai_decided` detector: business rules nobody asked for (see [behaviors and detectors](behaviors-and-detectors.md)) |
| Agent questions | Person | The user's answers to an agent's question (for example `AskUserQuestion`) |
| PR reviews | Person | Approvals and comments that pick an option ("let's go with B") |
| Slack, Jira, Linear | Person | Messages that settle a choice, when the data policy allows reading them |
| Vantage actions | Person | Approving or changing a behavior, parking, splitting, freezing a why tree |

Detection uses rules first (choice phrases, question-and-answer pairs, review states), then an optional judge: "Does this message settle a choice between options?" Gated by the data policy setting.

## Lifecycle

- **AI decisions start as `proposed`.** They show a scale-icon badge on the item's dot until a person approves or changes them.
- **Person decisions start as `approved`.**
- **Changing** a decision records a new one with status `approved` and marks the old one `changed`, linked both ways.
- **Reverting** happens when later evidence undoes it (for example the code is removed); the record stays, marked `reverted`.
- Nothing is deleted. The log is append-only, like events (D33).

## UX

- **Item page, Decisions section:** a short timeline, newest first. Each row: who (AI or person avatar), one-line decision, status chip. Expanding a row shows the five fields and evidence links. Proposed AI decisions have **Approve** and **Change**.
- **Landscape:** a scale-icon badge on dots with proposed AI decisions.
- **Focus digest:** "3 AI decisions to review."
- **Project and week views:** "Decisions made" lists all decisions in the period, filterable by who and status. Useful for standups and handovers.
- **Explain** cites decisions as evidence and shows them in the *why* tree's "Options considered" branch.

## Relation to existing pieces

- `ai_decided` flag: becomes one source of proposed decisions; the flag clears when the decision is approved or changed.
- AI-decided behaviors: a behavior that comes from a decision links to it.
- `user_actions`: still the raw replay log; the decision log is the readable layer on top.

## Privacy

- Transcript and message excerpts used as evidence stay local.
- Reading Slack, Jira or Linear for decisions follows the data policy setting.
