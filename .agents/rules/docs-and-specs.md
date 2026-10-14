# Docs and specs

- `docs/PRD.md` holds goals and scope. `docs/ROADMAP.md` holds the phases. `docs/specs/<topic>.md` holds the design. `docs/DECISIONS.md` logs decisions; `docs/OPEN-QUESTIONS.md` lists what isn't decided.
- If a change alters behaviour, an interface or a decision, update the affected spec in the same PR. Use the `update-spec` skill.
- A new decision gets a row in `docs/DECISIONS.md` (date, decision, why). A proposal the user hasn't confirmed goes in its "Proposed" section.
- An answered open question is removed from `docs/OPEN-QUESTIONS.md` and its answer recorded where it belongs (a decision or a spec).
- The scope decisions in the PRD are settled. Don't re-open them in specs; raise them with the user instead.
- Track deliverables with task checkboxes (`- [ ]` / `- [x]`) in `docs/ROADMAP.md` and specs, and tick them in the same PR that delivers them.
- Code references give `path:line` and are checked against the tree before citing.
- Write directly: no filler, tables where they help, short sentences.
