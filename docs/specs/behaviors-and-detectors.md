# Spec: behaviors, detectors and resume

> **Status:** draft. Fills features that other specs name but don't define.

> **Terms:** [flag](../GLOSSARY.md#flag), [work item](../GLOSSARY.md#work-item), [worktree](../GLOSSARY.md#worktree). Plain-language definitions are in the [glossary](../GLOSSARY.md).

## Behaviors (Given/When/Then)

A behavior is one short expected outcome on a work item. Proof level L3 needs behaviors.

| Source | How | Trust |
|---|---|---|
| **Ticket** | Acceptance criteria from Jira or Linear, split into rows | High; marked `origin = ticket` |
| **User** | Typed or edited on the Item page | Highest |
| **Agent** | Proposed through the MCP server (D48) or extracted from a prompt | Suggested until the user approves |
| **AI decided** | Found by the detector below | Always needs approve or change |

- Each behavior is one line, about 140 characters at most.
- Unapproved suggestions never block a stage; they only show as "suggested".
- Phase 2 ships without behaviors: proof works at L1 and L2. Behaviors arrive with the "Later" roadmap items.

## Detector: AI decided alone (`ai_decided`)

Flags business rules in a diff that nobody asked for.

1. **Candidates (rules, no model):** added lines that introduce constants or rules: timeouts, retry counts, limits, money or percentage math, permission checks, schema cascades (`ON DELETE CASCADE`), feature flags.
2. **Filter:** drop candidates whose value or name appears in the request, the ticket or an approved behavior.
3. **Judge (optional, data policy permitting):** for each remaining hunk, a yes/no question: "Does this hunk add a business rule not stated in the request?"
4. **Output:** a suggested behavior marked AI decided, with Approve or Change. Dismissals are counted for flag precision.

## Detector: commitments

Turns "I'll check this" into a `commitment` item.

1. **Candidates:** messages *by the user* in Slack, Jira, Linear or GitHub matching commitment phrases ("I'll", "will check", "on it", "let me look", "will fix"), in the languages the user writes.
2. **Judge (optional):** "Is this message a promise by the author to do something?"
3. **Output:** a proposed commitment item linked to the thread, confirmed by the user or dismissed. Capped per day to avoid noise.
4. **Done when:** linked to an own-work item, or marked done.

## Resume with context

What happens when the user clicks Resume on an item.

- **Same session still exists:** copy or run `claude --resume <session-id>` (or the Codex equivalent) with a short preamble.
- **No usable session:** start a fresh one with a generated prompt.
- **The generated prompt contains, and only contains:**
  - item title, issue key, branch or worktree;
  - current stage and what evidence is missing ("no proof after the last edit to `billing.ts`");
  - open review threads and unapproved behaviors;
  - last 3 relevant events (one line each).
- It never pastes whole transcripts. It stays under about 1,500 words.
- Vantage shows the prompt before running anything; the user confirms.
