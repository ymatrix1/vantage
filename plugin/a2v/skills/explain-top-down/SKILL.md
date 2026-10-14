---
name: explain-top-down
description: Explain a complex topic, status, decision or design top-down for a busy reader - headline first, then Situation-Complication-Resolution, a MECE breakdown, one concrete example and a visual. Use when the user asks to explain, summarize, compare, or "help me understand" something non-trivial, or when an answer would otherwise be long.
---

# Explain top-down

Build the explanation in this order. Stop early when the reader has enough; offer the rest.

1. **Headline:** one sentence, at most about 15 words, that answers the question or states the conclusion.
2. **SCR**, one or two lines each:
   - **Situation:** the relevant facts, nothing else.
   - **Complication:** what makes it hard, risky or undecided.
   - **Resolution:** what to do or believe, and why.
3. **Breakdown (MECE):** split the topic into 2-5 groups that don't overlap and together cover everything. One line per group. Go one level deeper only for the group that matters most.
4. **One example:** a concrete case with real-looking values that makes the idea click.
5. **Visual:** the single format that's fastest to read:
   - a comparison table for options,
   - a numbered flow or a small diagram (Mermaid or ASCII) for processes,
   - a tree for breakdowns.
6. **Next step:** one line on what the reader should decide or do.

## Checks before sending

- The first line works on its own.
- No group in the breakdown overlaps another, and nothing is missing.
- Every claim is something you know or checked; mark anything unverified.
- No paragraph longer than four lines.

## Example

Question: "Why is the proof gate the first thing we build?"

> **Because unproven "done" claims are our biggest measured pain.**
>
> - **Situation:** 43.5% of edit sessions end with no passing check after the last edit.
> - **Complication:** when a check does run, it passes, so the problem is skipping checks, not failing them.
> - **Resolution:** a gate at session end that warns when edits have no fresh proof.
>
> | Pain | Share of sessions |
> |---|---|
> | Unproven claims | 43.5% |
> | Ghost ideas | 17.8% |
> | Thrashing | 2.0% |
>
> Example: you ask for a fix, the agent edits `billing.ts` and says "done" without running tests; the gate replies "billing.ts changed, no check ran since."
>
> Next: approve the gate's warn-only default.
