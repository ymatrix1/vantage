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
10. **Compact by default.** Say each thing once, in the fewest words that keep the meaning. One idea per line. Show cause and effect with an arrow (`A -> B`) and definitions with `=`. Cut anything the reader can infer: "this means", "as you can see", restating the question, explaining a number the table already shows. A reply is about 12 lines or fewer unless the reader asked for detail; offer the rest ("Want the details?").

**Precedence:** if another style instruction asks for dropped words or shorthand, keep every word that carries meaning. Short means fewer ideas and fewer words per idea, not broken grammar. Arrow lines, symbols and action lines (below) are the allowed short forms.

## Symbols

Use this fixed set, at the start of a line, one symbol per item. Don't invent new ones, and don't decorate headings or prose with them.

| Symbol | Meaning | Example |
|---|---|---|
| ✅ | Done, passed, verified | `✅ pnpm check: 43 of 43 tests pass` |
| ❌ | Failed or broken | `❌ windows-latest: 2 scanner tests fail` |
| 🚧 | Blocked by something outside this task | `🚧 PR #9 merge: waits on PR #10` |
| ⚠️ | Risk, caveat, partly done | `⚠️ cold start is 215 ms, budget is 100 ms` |
| ⬜ | Not checked or not done yet | `⬜ new session loads the rule` |
| ⏭️ | Skipped on purpose | `⏭️ pnpm check: no code changed` |
| ⏳ | Running or waiting on something | `⏳ CI re-running on 8ba2b4b` |
| ❓ | Open question or unknown | `❓ does the hook fire in child sessions?` |
| 👉 | Next step or a decision for the reader | `👉 Merge PR #9?` |
| → | Leads to, moves to | `✅ pushed → origin/feat/git-scanner` |

Rules for symbols:

- A symbol never stands alone as proof. Pair it with what was checked: the command, the file or the count.
- ✅ means a check ran after the last edit. If you did not run it, use ⬜ and say why.
- Use the same symbol for the same meaning for the whole reply.
- Name a thing once, in short form: `PR owner/repo#N · short title…`, then the state and its symbol. Don't repeat the full title or restate what the reader just asked for. A completed routine action needs one line, such as `PR ymatrix1/vantage#11 · docs(a2v): import communication…  updated ✅`, not a sentence that says the same thing twice.
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

## Compact example

Instead of:

> Isso significa que o escopo @ymatrix1 é seu e dá para publicar @ymatrix1/vantage sem criar organização nova.

Write:

> Escopo @ymatrix1 é seu -> dá para publicar @ymatrix1/vantage.

Instead of a paragraph explaining three causes, write one line each:

> `vantage` no npm = nome tomado -> usar `@ymatrix1/vantage`
> 2FA ligado -> publish pede código
> Pacote ainda não existe -> primeiro publish é manual

## Action lines

When you report something you just did, write a log line, not a story: past-tense verb first, no "I", the object, and a reason only if it changes what the reader must do. Aim for 12 words or fewer.

| Instead of | Write |
|---|---|
| I told in 31 to wait for my word before rebasing, since #10 isn't merged yet. | Messaged in 31: wait for #10 merge before rebasing. |
| I ran the checks again after the last edit and they all passed. | ✅ `pnpm check`: 43 of 43 pass |
| I opened a pull request for the CLAUDE.md change. | Opened PR ymatrix1/vantage#11 · docs(a2v): import communication… |

Rules for action lines:

- Use short handles the reader already knows (`in 31`, `#10`, `3vuw`), not full titles or ids.
- Keep every word that changes the meaning: who, what, and any condition ("wait for #10 merge" must keep "merge").
- Don't use action-line style for explanations, reasons or trade-offs. Those still get full, clear sentences.
- One action per line. Group lines under the result they support.

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
