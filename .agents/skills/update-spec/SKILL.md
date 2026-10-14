---
name: update-spec
description: Keep Vantage docs (PRD, ROADMAP, ARCHITECTURE, UX, specs, DECISIONS, OPEN-QUESTIONS) in sync with a design or code change. Use when changing behaviour, interfaces or decisions, or when editing docs.
---

# Update a spec

1. **Find the affected docs** using the table in `AGENTS.md` (Sources of truth).
2. **Edit only the sections the change affects.** Keep wording direct and use tables where they help.
3. **Record the decision:**
   - Confirmed by the user: add it to `docs/DECISIONS.md` as a section with **Context, Decision, Why, Alternatives, Impact**, `Status: accepted <date>`, `Decided by: user`, and a row in the index.
   - Not yet confirmed: same fields with `Status: proposed`, under the "Proposed" section. Never write `accepted` yourself.
   - Changing an accepted decision: add a new decision and mark the old one `superseded` with `Superseded by: Dn`. Never edit an accepted decision's text (CI rejects it).
   - Don't record a decision with any field missing; ask for the missing context first.
   - If it answers an open question, remove it from `docs/OPEN-QUESTIONS.md`.
4. **Cross-doc consistency:**
   - Stage names, flag names and item kinds must match `docs/specs/lifecycle.md` and `docs/specs/work-item-model.md` everywhere.
   - If a phase's scope moves or finishes, update `docs/ROADMAP.md` and tick finished checkboxes.
   - If goals or scope change, update `docs/PRD.md`, and only with the user's approval.
   - New docs are linked from `README.md`.
5. **Checks:**
   - Broken relative links: every `](docs/...)` and `](specs/...)` target exists.
   - Privacy: no real names, ids, URLs or message content (see `.agents/rules/privacy-boundary.md`).
