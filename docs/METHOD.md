# A2V: Asked to Verified

*From asked to verified, with evidence at every step.*

A2V is a method for delivering software when much of the work is done by AI agents. It replaces "the agent says it's done" with a short track that every piece of work moves along, one step at a time, and only on evidence. Vantage is the tool that runs it; the method stands on its own and works with any tooling.

## The A2V track

```
Asked → Built → Proven → Reviewed → Shipped → Verified
```

| Step | Question it answers | Evidence that completes it |
|---|---|---|
| **Asked** | Is this something we actually want? | A ticket, a branch, a recorded request or a commitment |
| **Built** | Does code for it exist? | A diff linked to the work |
| **Proven** | Does it work? | A check that ran after the last change and passed |
| **Reviewed** | Does someone else agree? | An approved review with blocking threads resolved |
| **Shipped** | Is it out? | Merged and deployed |
| **Verified** | Does it work where it matters? | Post-deploy checks passed and monitoring stayed clean |

## The five rules

1. **Evidence moves work; claims don't.** A step is complete only when its evidence exists. "Done", "fixed" or "optimized" in a message moves nothing.
2. **Proof expires.** Proof belongs to the code it checked. Change the code and the proof is gone; the work drops back to Built.
3. **Weak proof is shown, not hidden.** Every proof has a level, from L1 (a check passed) to L4 (it passed in production). Nobody has to guess how strong "tested" was.
4. **Honest dots.** A step that was skipped or isn't set up is shown hollow, never green.
5. **Problems after release start new work.** A regression opens a linked follow-up instead of quietly reopening finished work, so the record of what shipped stays true.

## Proof levels

| Level | Name | Meaning |
|---|---|---|
| L0 | Claimed | Someone said it works. Not proof. |
| L1 | Ran | A real check passed after the last change. |
| L2 | Linked | That check touches the changed code. |
| L3 | Behavior | The check maps to a specific expected behavior. |
| L4 | Production | It passed after deploy. |

## Signals

Signals are warnings that can sit on any piece of work, whatever its step: *waiting on you*, *AI decided alone*, *unproven claim*, *thrashing*, *collision*, *forgotten*, *unseen mention*, *claimed fixed*, *shipped unverified*, *regression*. Each one has one clear action.

## Calm practices

A2V is also about stress. Its practices for the person doing the work:

- **Three things today.** Focus on the top three items; everything else is batched.
- **Interrupt only for red.** Other changes arrive in a digest at chosen times.
- **Say "safe to ignore" out loud.** Knowing what you can skip is as useful as knowing what to do.

## Glossary

| Term | Meaning |
|---|---|
| Work item | One goal, one card, one A2V track |
| Step | One of the six stages of the A2V track |
| Proof | A captured record of a check that ran, with type, level and the code it covered |
| Signal | A warning on a work item (also called a flag in the specs) |
| Follow-up | New work created by a regression, linked to the original |

## How Vantage implements A2V

- Track and gates: [lifecycle spec](specs/lifecycle.md)
- Proof types, levels and expiry: [proof spec](specs/proof.md)
- What counts as one work item: [work item model](specs/work-item-model.md)
- Signals, priority and calm: [scoring spec](specs/scoring.md), [UX](UX.md)

## Naming

Always write the full form, **A2V: Asked to Verified**, the first time it appears. An unrelated "Agility to Value (A2V)" framework exists in agile consulting. A trademark and domain check is required before A2V is offered commercially.
