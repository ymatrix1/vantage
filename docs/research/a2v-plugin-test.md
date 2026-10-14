# Research: A2V plugin test

> **Bean:** `vantage-lf3d`. **Checked:** 2026-10-14, plugin `a2v` v0.2.0 (`plugin/a2v/`), installed as `a2v@vantage` at user scope, in a Claude Code desktop session on Windows.

## Answer

**All three skills load and mostly behave as written; the communication rule only reaches agents through this repo's `CLAUDE.md`, and it loses to other style instructions.**

| Piece | Result | Main problem |
|---|---|---|
| Loading | Partial pass | The rule is not shipped by the plugin itself; the output style was not active |
| `explain-top-down` | Pass | "One visual" and "stop early" are ambiguous next to a six-part checklist |
| `prove-it` | Pass, with a gap | Proof levels don't match the spec's L0-L4 names; "docs only: none needed" contradicts evidence over claims |
| `record-decision` | Pass | Says "five fields" but the template has six; doesn't say what to do when the record is hypothetical |
| Communication rule | Fail in practice | A session-level "caveman" hook and the Concise output style override rule 6 (full sentences) |

Next: apply the fixes below in one `fix(plugin)` PR and bump the plugin to 0.2.1.

## 1. Loading

| Check | Result | Evidence |
|---|---|---|
| `a2v:explain-top-down` in available skills | Pass | Listed in the session's skill list; `Skill` call loaded it |
| `a2v:prove-it` in available skills | Pass | Same |
| `a2v:record-decision` in available skills | Pass | Same |
| Communication rule in context | Pass, only here | Loaded by `@plugin/a2v/rules/communication.md` in `CLAUDE.md`. Claude Code plugins have no `rules/` component, so other projects that install the plugin don't get it. |
| Output style `A2V Top-down` active | Not active | The session ran with the "Concise" output style. The style exists but must be chosen by the user; nothing says so. |
| Skills load from the worktree | Note | Skills loaded from `C:\dev\vantage\plugin\a2v\...` (main checkout), not the worktree. Edits on a branch aren't tested until merged or the plugin is reinstalled. |

## 2. explain-top-down

Input: "Explain the A2V track and why proof expires", from `docs/METHOD.md` and `docs/specs/proof.md`. Output produced:

> **Work moves only on evidence, and proof stops counting once the code it checked changes.**
>
> - **Situation:** every work item moves along six steps, Asked to Verified, and each step needs its own evidence.
> - **Complication:** a check that passed before an edit says nothing about the code after it, yet it still looks green.
> - **Resolution:** tie each proof to a fingerprint of the files it covered; any later edit to those files expires it and the item drops back to Built.
>
> ```
> Asked → Built → Proven → Reviewed → Shipped → Verified
>           ↑        │
>           └─ edit ─┘  (proof expired)
> ```
>
> | Group | Steps | Evidence |
> |---|---|---|
> | Make it | Asked, Built | A request, then a linked diff |
> | Prove it | Proven | A check that passed after the last edit |
> | Agree and release | Reviewed, Shipped | An approved review, then merge and deploy |
> | Confirm in production | Verified | Post-deploy checks and clean monitoring |
>
> Example: tests pass on `billing.ts` at 10:02, so the item is Proven. At 10:05 the agent edits `billing.ts` again; the fingerprint no longer matches, the proof shows struck through, and the item is back in Built until tests run again.
>
> Next: read the freshness section of the proof spec if you need the per-behavior rule.

| Check (from the skill) | Result | Evidence |
|---|---|---|
| Headline of at most about 15 words that works alone | Pass | 17 words; "about 15" allows it |
| SCR, one or two lines each | Pass | Three bullets, one line each |
| MECE breakdown, 2-5 groups | Pass | Four groups cover all six steps once each |
| One concrete example | Pass | `billing.ts` at 10:02 and 10:05 |
| One visual | Ambiguous | Output has a flow diagram and a table; the skill says "the single format", but its own example also mixes a list and a table |
| Next step | Pass | Last line |
| No paragraph over four lines | Pass | Longest is the example, three lines |
| Claims checked | Pass | Steps from `docs/METHOD.md` (track table, rule 2); fingerprint and "struck through" from `docs/specs/proof.md` (Freshness) |

## 3. prove-it

Edit: appended one sentence to `docs/research/baseline.md` on this branch, then reverted it.

> **Proof:** `python tools/check_docs.py` passed, "0 problem(s) in 94 tracked files", exit 0, after the last edit to `docs/research/baseline.md` (level: ran).

| Check | Result | Evidence |
|---|---|---|
| Runs the project's docs check after the edit | Pass | Command above ran after the edit; skill's "Docs only" row pointed to it |
| Reports command, result and level | Pass | One-block format followed |
| Doesn't claim more than it ran | Pass | Level "ran", not "linked": the added sentence had no links, so the check didn't exercise anything new |
| Edit reverted | Pass | `git checkout -- docs/research/baseline.md`; `git status --short` empty |
| Gap found | Fail risk | `check_docs.py` scans `git ls-files` only. A new untracked file is never checked, yet the run still says "0 problems". The skill's "read the result" step doesn't warn about this. |

## 4. record-decision

Input: "We chose to keep the A2V plugin in this repo instead of a separate repo." Not written to `docs/DECISIONS.md`. Record the skill produced:

```markdown
### D64. Keep the A2V plugin in the Vantage repo

- **Context:** The a2v plugin (communication rule, output style, three skills) lives in `plugin/a2v/` and is installed from this repo as `a2v@vantage`.
- **Decision:** Keep the plugin in this repo rather than move it to its own repo.
- **Why:** ? (ask)
- **Alternatives:** A separate repo; ? (ask why it lost)
- **Impact:** ? (ask; candidate: plugin versions are tied to Vantage commits, and other projects must add the Vantage repo as a marketplace)
- **Who:** ? (ask: the user, or an agent proposal)
```

Questions the skill made me ask instead of inventing: Why was this chosen? Why did a separate repo lose? What would make you revisit it? Who decided?

| Check | Result | Evidence |
|---|---|---|
| All five fields present | Pass | Context, Decision, Why, Alternatives, Impact |
| Who present | Pass | Sixth line |
| Unknown fields asked, not invented | Pass | Why, Impact, Who left as questions; only Context and Decision come from the input or the tree |
| Next free id | Pass | Last id in `docs/DECISIONS.md` is D63 |
| Related decision noticed | Not required | D44 already commits to "one Claude Code plugin"; the skill doesn't ask to link related decisions |

## 5. Communication rule across the session

| Rule | Result | Evidence |
|---|---|---|
| Answer first | Pass | This report and the PR open with the answer |
| Tables or lists over paragraphs | Pass | Every section is a table |
| Plain full sentences | Fail in chat | A user-level "caveman" hook told the agent to drop articles and use fragments, directly against rule 6 and the "No shorthand" don't |
| Example for abstract ideas | Pass | Proof expiry example in section 2 |
| Short | Pass | |
| Next step at the end | Pass | Final line of the Answer section and the PR |

When two style instructions conflict, nothing in the rule says which wins. Here the hook and output style won because they arrive later in context.

## Fixes

| File | Change |
|---|---|
| `plugin/a2v/rules/communication.md` | Plugins can't ship rules. Move the text into a skill (for example `a2v:communicate`) or the output style, and say in the plugin README how projects import it. |
| `plugin/a2v/rules/communication.md` | Add a line on precedence: "If another style instruction asks for fragments or dropped words, keep full sentences." |
| `plugin/a2v/output-styles/a2v-top-down.md` | State that users must choose it (`/output-style` or the app's setting); add the install note to a plugin README. |
| `plugin/a2v/skills/prove-it/SKILL.md` | Map levels to the spec: Claimed = L0, Ran = L1, Linked = L2, Behavior = L3, Production = L4. |
| `plugin/a2v/skills/prove-it/SKILL.md` | Replace "Docs only ... otherwise none needed" with "otherwise say Not proven: no docs check". "None needed" lets docs edits skip proof. |
| `plugin/a2v/skills/prove-it/SKILL.md` | In step 4, add: "Check the tool actually covered the changed files (for example a checker that scans only tracked files misses new ones)." |
| `plugin/a2v/skills/record-decision/SKILL.md` | Step 2 says "all five fields" but the template has six; say "all six fields, Who included". |
| `plugin/a2v/skills/record-decision/SKILL.md` | Add: "Link any earlier decision this one refines or overlaps." |
| `plugin/a2v/skills/explain-top-down/SKILL.md` | Say whether the SCR list and breakdown count as the visual, or allow "one main visual". |
| `plugin/a2v/.claude-plugin/plugin.json` | Description says proof and decisions come "later"; they ship now. Update it and bump the version. |

## Ambiguous wording

- **explain-top-down:** "Stop early when the reader has enough" versus a checklist that expects all six parts. Which parts are required?
- **explain-top-down:** "at most about 15 words" has no hard limit.
- **prove-it:** "Linked: that check exercises the changed code" has no test for docs. Does a whole-repo checker count?
- **record-decision:** no rule for a hypothetical or dry run; it says to write to the log, and step 1 even creates the log if missing.
- **record-decision:** "Write 'not stated' only for something the source truly never said" overlaps with "ask instead of inventing". When to ask versus write "not stated" is unclear.
