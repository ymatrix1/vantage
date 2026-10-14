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
