# A2V communication

How agents talk to people in any project that uses A2V. Readers are busy: they should get the answer in seconds and choose how deep to go.

## The rules

1. **Answer first.** The first sentence is the answer, decision or result. No preamble, no restating the question.
2. **Top-down.** Answer, then the few reasons that support it, then details. A reader who stops after the first line still has the point.
3. **Show, don't tell.** Prefer a table, a short list, a diagram or an example over a paragraph. Use a visual whenever it's faster to read than prose.
4. **One example for anything abstract.** If an idea is new or complex, add one concrete example right after it.
5. **Short by default.** Cut filler, hedging and repetition. Every sentence must earn its place. Expand only when asked.
6. **Plain words.** Write full, clear sentences in everyday language. Explain jargon the first time or replace it.
7. **Evidence, not claims.** State what was checked and how. Say plainly what wasn't checked.
8. **End with the next step**, when there is one: what the reader should decide or do. One line.

9. **Symbols for state.** Mark status, results and next steps with the symbols below, so a reader can scan a result without reading it.

**Precedence:** if another style instruction asks for fragments, dropped words or shorthand, keep full, clear sentences. Shorter means fewer ideas, not broken grammar. Symbols replace status words, not sentences.

## Symbols

Use this fixed set, at the start of a line, one symbol per item. Don't invent new ones, and don't decorate headings or prose with them.

| Symbol | Meaning | Example |
|---|---|---|
| ✅ | Done, passed, verified | `✅ pnpm check: 43 of 43 tests pass` |
| ❌ | Failed, broken, blocked | `❌ windows-latest: 2 scanner tests fail` |
| ⚠️ | Risk, caveat, partly done | `⚠️ cold start is 215 ms, budget is 100 ms` |
| ⬜ | Not checked or not done yet | `⬜ new session loads the rule` |
| ⏳ | Running or waiting on something | `⏳ CI re-running on 8ba2b4b` |
| 👉 | Next step or a decision for the reader | `👉 Merge PR #9?` |
| → | Leads to, moves to | `✅ pushed → origin/feat/git-scanner` |

Rules for symbols:

- A symbol never stands alone as proof. Pair it with what was checked: the command, the file or the count.
- ✅ means a check ran after the last edit. If you did not run it, use ⬜ and say why.
- Use the same symbol for the same meaning for the whole reply.
- These are for messages to people. They do not go into commit messages, PR titles, code, docs or specs.
- Product UI is separate: Vantage's own screens, flags and status line follow `docs/specs/visual-language.md` (line icons, never emoji).

Instead of:

> I committed the change and pushed it to the branch. I could not run the full test suite because dependencies are missing.

Write:

> **CLAUDE.md change is pushed.**
>
> ✅ committed → `claude/next-tasks-54a7fc`
> ✅ pushed → `origin/claude/next-tasks-54a7fc`
> ⬜ `pnpm check`: not run, `node_modules` is missing in this worktree
>
> 👉 Open the PR?

## Formats that work

| Need | Use |
|---|---|
| Compare options | A table: option, what it gives, cost, recommendation |
| Status | One line per item: name, state, what's missing |
| Process or flow | A numbered list, or a small diagram |
| Complex idea | Headline, then Situation, Complication, Resolution, then one example |
| Breakdown | Groups that don't overlap and cover everything (MECE), at most 5 per level |

## Don'ts

- No walls of text. If a paragraph runs past four lines, turn it into a list or table.
- No "Great question", "I hope this helps" or closing summaries that repeat the answer.
- No shorthand that drops words to save space; short means fewer ideas, not broken sentences.
- No more detail than the reader asked for. Offer it instead: "Want the details on X?"

## Example

Instead of:

> I looked into the different options for the database and there are several things to consider. SQLite is a lightweight option that works well for many cases, while DuckDB is designed for analytics...

Write:

> **Keep SQLite; use DuckDB only for analysis.**
>
> | | SQLite | DuckDB |
> |---|---|---|
> | Built for | Many small writes | Big scans |
> | Fits our live data | Yes | No: one writer only |
>
> Next: confirm, and I'll update the architecture doc.
