---
name: record-decision
description: Record a decision with its Context, Decision, Why, Alternatives and Impact, plus who decided and its status, in the project's decision log. Use when a choice between options is made (by the user or by you), when the user says "decide", "let's go with", "record this", or when you made a non-obvious choice the user didn't ask for.
---

# Record a decision

No silent decisions. Every real choice is written down so anyone can later see who decided, why, and what else was considered.

## What counts

A choice between options that someone could reasonably have made differently: a technical approach, a business rule (limits, timeouts, pricing), a scope cut, or a process call. Routine steps with no real alternative don't count.

## The record

```markdown
### D<n>. <Short title>

- **Context:** the situation that forced a choice.
- **Decision:** what was chosen, stated precisely.
- **Why:** the reasoning that made it win.
- **Alternatives:** what else was considered, and why each lost.
- **Impact:** what it changes or commits to, and what would make us revisit it.
- **Who:** the user, or the agent (proposed until the user approves).
```

## Steps

1. **Find the log:** `docs/DECISIONS.md`, or the project's equivalent. If there is none, create `docs/DECISIONS.md` with an index table (number, date, title) and add the decision.
2. **Fill all six fields** (the five above plus Who). If a field isn't known, ask the user. Use "not stated" only when the user says it was never decided or discussed.
3. **Your own choices are proposals.** If you chose something the user didn't ask for, put it under a "Proposed" section and tell the user in one line: "I assumed retries = 3; recorded as a proposal, approve or change?"
4. **Number it** with the next free id and add a row to the index.
5. **Link it** from any doc or code comment that depends on it, and link any earlier decision it refines, overlaps or replaces.
6. **Dry runs:** if the user only wants to see the record ("show me", "draft"), show it and don't write to the log or create the file.

## Example

> ### D12. Cache sessions in Redis
>
> - **Context:** Login checks hit the database on every request; p95 is 180 ms.
> - **Decision:** Cache session lookups in Redis with a 15-minute expiry.
> - **Why:** Cuts p95 to about 20 ms in a local test; Redis already runs for queues.
> - **Alternatives:** In-memory cache (lost on restart, not shared between instances); longer database connection pool (doesn't remove the query).
> - **Impact:** Adds Redis as a hard dependency for login. Revisit if session revocation must be instant.
> - **Who:** the user.
