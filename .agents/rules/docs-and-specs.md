# Docs and specs

- `docs/PRD.md` holds goals and scope. `docs/ROADMAP.md` holds the phases. `docs/specs/<topic>.md` holds the design. `docs/DECISIONS.md` logs decisions; `docs/OPEN-QUESTIONS.md` lists what isn't decided.
- If a change alters behaviour, an interface or a decision, update the affected spec in the same PR. Use the `update-spec` skill.
- **Every decision records five fields** in `docs/DECISIONS.md`, and gets a row in its index:
  - **Context:** the situation and problem that forced a choice.
  - **Decision:** what was chosen, stated precisely.
  - **Why:** the reasoning that made this option win.
  - **Alternatives:** what else was considered and why it lost.
  - **Impact:** what it changes or commits us to (docs, code, scope, cost, risk), and what would make us revisit it.

  - **Status:** `proposed`, `accepted`, `superseded` or `rejected`, with **Decided by** once decided, and **Superseded by** when superseded (D69).

  A decision missing any field isn't recorded yet. A proposal the user hasn't confirmed uses the same fields under "Proposed" with status `proposed`. Only the user accepts or rejects a decision; an agent never writes `accepted` on its own. An accepted decision is frozen: a change is a new decision that supersedes the old one. `tools/check_docs.py` enforces this in CI.
- An answered open question is removed from `docs/OPEN-QUESTIONS.md` and its answer recorded where it belongs (a decision or a spec).
- The scope decisions in the PRD are settled. Don't re-open them in specs; raise them with the user instead.
- Track deliverables with task checkboxes (`- [ ]` / `- [x]`) in `docs/ROADMAP.md` and specs, and tick them in the same PR that delivers them.
- Code references give `path:line` and are checked against the tree before citing.
- Write directly: no filler, tables where they help, short sentences.
