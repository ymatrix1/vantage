<!--
Style note: this page is for lay readers and newcomers, so it uses full, friendly sentences instead of the
compact answer-first style of the specs (plugin/a2v/rules/communication.md). Every entry has the same three
lines: Plain, Example, Defined in. tools/check_docs.py (tools/glossary_check.py) checks that every entry has them,
that the core terms exist, and that docs using a core term link to its entry.
-->

# Glossary

Every term the docs and the Track page use, A to Z. Each entry says what it means in plain words, gives one example, and points to the spec that defines it exactly.

New here? Read the [guide](GUIDE.md) first. In Portuguese: [Glossário](pt-BR/GLOSSARY.md).

## Borrowed method terms

The docs use a few ideas from management consulting. They are here for one reason: **readers are busy**. Answer first, then the reasons, then the details, so someone who stops reading after one line still has the point. These entries link to outside sources.

## A

### A2V
**Plain:** "Asked to Verified", the method Vantage follows. Every piece of work moves along six steps and only evidence moves it forward.
**Example:** a ticket is Asked, code is Built, a test run proves it, a reviewer agrees, it deploys, and monitoring stays quiet.
**Defined in:** [A2V method](METHOD.md)

### A2V track
**Plain:** the six steps in order: Asked, Built, Proven, Reviewed, Shipped, Verified.
**Example:** an item that has code and a passing test sits at "Proven"; the next two steps are still empty dots.
**Defined in:** [A2V method](METHOD.md#the-a2v-track), [Lifecycle](specs/lifecycle.md)

### Anchor
**Plain:** a label that ties evidence to one piece of work, such as a ticket key, a branch or a pull request number.
**Example:** a commit on the branch `feat/login` and a session started in that branch both attach to the item anchored to `feat/login`.
**Defined in:** [Work item model](specs/work-item-model.md#anchors-in-order-of-trust)

### Answer first
**Plain:** the writing rule that the first sentence is the answer, then the reasons, then the details. Vantage's docs and its Explain briefs follow it. See also [Pyramid Principle](#pyramid-principle).
**Example:** "Keep SQLite; use DuckDB only for analysis." comes before the comparison table.
**Defined in:** [Communication rule](../plugin/a2v/rules/communication.md), [Explain](specs/explain.md)

### Asked
**Plain:** the first step. Someone wants this work: a ticket, a branch, a request to an agent, or a promise.
**Example:** you tell Claude Code "add a retry to the uploader"; the item is Asked before any code exists.
**Defined in:** [Lifecycle](specs/lifecycle.md)

## B

### Backfill
**Plain:** reading older history (the last 14 days by default) so the Track page is not empty on day one.
**Example:** after `vantage add`, last week's Claude Code sessions in that repo appear as items.
**Defined in:** [First run](specs/first-run.md), [Ingestion](specs/ingestion.md)

### Behavior
**Plain:** one short "given, when, then" sentence saying what the work should do, so you judge behavior instead of reading a diff.
**Example:** "Given a failed upload, when it is retried, then it stops after 3 tries."
**Defined in:** [Work item model](specs/work-item-model.md#entities), [Behaviors and detectors](specs/behaviors-and-detectors.md)

### Built
**Plain:** code for the work exists: a diff is linked to the item.
**Example:** the agent edited three files on the branch; the item is Built, not yet Proven.
**Defined in:** [Lifecycle](specs/lifecycle.md)

## C

### Calm
**Plain:** the design goal of showing little: the top 3 things, a digest for the rest, and an explicit "safe to ignore".
**Example:** "Nothing needs you. 9 items safe to ignore."
**Defined in:** [UX](UX.md), [Visual language](specs/visual-language.md)

## D

### Daemon
**Plain:** the small background program (`vantage start`) that reads the spool, keeps the database up to date and serves the Track page on your own machine.
**Example:** close the terminal running `vantage start` and the Track page stops updating.
**Defined in:** [Operations](specs/operations.md), [Architecture](ARCHITECTURE.md)

### Decision log
**Plain:** a written record of every choice, by an agent or a person, with why and what else was considered.
**Example:** an agent picks "retry 3 times" on its own; that choice is listed as a proposal until you approve it.
**Defined in:** [Decision log](specs/decision-log.md)

### Derived session
**Plain:** a session that carries on another one (a resume, a fork, a continuation or a sub-agent), so it joins the parent's item instead of making a new one.
**Example:** you run `/clear` and keep working; the new session lands on the same item.
**Defined in:** [Work item model](specs/work-item-model.md#derived-sessions)

### Dot
**Plain:** the small symbol for one step of the track. Its shape tells the state (filled, ring, half filled, dash) and its color backs it up.
**Example:** a filled green dot is done; a half filled amber dot is "built, no proof yet".
**Defined in:** [Visual language](specs/visual-language.md#the-dot-alphabet)

## E

### Evidence
**Plain:** a fact Vantage saw itself: a diff, a command that ran with its exit code, an approval, a deploy. What an agent says is not evidence.
**Example:** "tests pass" in a chat message is a claim; a `vitest` run with exit 0 that Vantage captured is evidence.
**Defined in:** [A2V method](METHOD.md#the-five-rules), [Proof](specs/proof.md)

### Expired proof
**Plain:** a proof that no longer counts because the code changed after the check ran. The item drops back from Proven to Built.
**Example:** tests passed, then the agent edited `upload.ts`; the proof is struck through and the item is Built again.
**Defined in:** [Proof](specs/proof.md#freshness)

### Explain
**Plain:** an on-demand, answer-first brief about an item, a project or a week, written by the agent you already use. Press `e` on anything.
**Example:** "Why is this item stuck?" opens a short answer, then the reasons, then a click-to-expand breakdown.
**Defined in:** [Explain](specs/explain.md)

## F

### Flag
**Plain:** a warning on a work item, with one suggested action. The method calls the same thing a [signal](#signal).
**Example:** `unproven_claim` says "the agent claimed it was done but no check ran after the last edit"; the action is "Ask for proof".
**Defined in:** [Flag registry](specs/flags.md)

### Fingerprint
**Plain:** the "code fingerprint": a record of which code a proof covered, used to tell whether the proof is still fresh.
**Example:** a test run covers `upload.ts`; any later edit to `upload.ts` makes its proof stale.
**Defined in:** [Proof](specs/proof.md#the-proof-record)

### Forgotten
**Plain:** a flag for work that was asked for or built and then had no activity for a while (5 days by default).
**Example:** a branch last touched six days ago shows a moon icon: resume, park or drop it.
**Defined in:** [Scoring](specs/scoring.md#staleness-and-forgotten), [Flag registry](specs/flags.md)

## H

### Hook
**Plain:** a small command that Claude Code (or git) runs at set moments, such as after every tool call. Vantage's hooks only write a line to the spool and return at once.
**Example:** after the agent runs a test, the `PostToolUse` hook records the command and its exit code.
**Defined in:** [Ingestion](specs/ingestion.md), [First run](specs/first-run.md#adding-an-existing-repo)

### Home (VANTAGE_HOME)
**Plain:** the folder where all your Vantage data lives: `~/.vantage` by default, or the folder named by the `VANTAGE_HOME` setting.
**Example:** `vantage tour --demo` uses a temporary home, so your real one is never touched.
**Defined in:** [Operations](specs/operations.md)

## I

### Issue tree
**Plain:** a way to break a big question into smaller sub-questions, drawn as a tree. Vantage's Explain uses it so you can open only the branches you care about. Outside reference: [Issue tree on Wikipedia](https://en.wikipedia.org/wiki/Issue_tree).
**Example:** "Why is the release late?" splits into "code not ready", "review waiting" and "deploy blocked", each of which can split again.
**Defined in:** [Explain](specs/explain.md)

## L

### Landscape
**Plain:** the home view drawn as a scene: what needs you in front, moving work in the middle, waiting work on the horizon, verified work as stars. It is a design, not built yet; the Track page is what exists today.
**Example:** three large dots in the foreground are today's three things.
**Defined in:** [Visual language](specs/visual-language.md#the-landscape-home)

### Linker
**Plain:** the part of Vantage that decides which item each event belongs to, using anchors first.
**Example:** an event with the branch `feat/login` links to that branch's item.
**Defined in:** [Work item model](specs/work-item-model.md#linking-rules)

## M

### MECE
**Plain:** "mutually exclusive, collectively exhaustive": groups that do not overlap and together cover everything. Vantage uses it so a breakdown has no double counting and no gaps. Outside reference: [MECE principle on Wikipedia](https://en.wikipedia.org/wiki/MECE_principle).
**Example:** items by stage (Asked, Built, Proven...) is MECE: every item is in exactly one.
**Defined in:** [Explain](specs/explain.md), [Communication rule](../plugin/a2v/rules/communication.md)

## N

### Needs you
**Plain:** the group of items that wait for something only you can do: answer a question, approve a decision, ask for proof. On a dot it is a ring with a small red badge.
**Example:** a session waiting on a permission prompt raises `waiting_on_you`.
**Defined in:** [Visual language](specs/visual-language.md#the-dot-alphabet), [Flag registry](specs/flags.md)

## P

### Proof
**Plain:** a record of a check that really ran, such as a test or a data query, captured by Vantage. It has a type and a level.
**Example:** `pnpm test` exited 0 and ran 43 tests after the last edit.
**Defined in:** [Proof](specs/proof.md)

### Proof level
**Plain:** how strong a proof is, from L0 to L4: L0 claimed (not proof), L1 ran, L2 linked to the changed code, L3 tied to a behavior, L4 passed in production.
**Example:** a test that imports the changed file is L2; `pnpm test || true` is not proof at all because it cannot fail.
**Defined in:** [Proof](specs/proof.md#strength-levels), [A2V method](METHOD.md#proof-levels)

### Proven
**Plain:** the third step. A check ran after the last edit and passed.
**Example:** the item turns from half filled amber ("no proof") to a filled green dot with one arc.
**Defined in:** [Lifecycle](specs/lifecycle.md), [Proof](specs/proof.md)

### Pyramid Principle
**Plain:** Barbara Minto's rule for writing: state the main point first, then the few ideas that support it, then the details underneath. Vantage's docs use it because readers are busy and may stop after one line. Outside references: [Barbara Minto on Wikipedia](https://en.wikipedia.org/wiki/Barbara_Minto), [Minto's own page on the concept](https://www.barbaraminto.com/concept). Also called top-down writing.
**Example:** "Keep SQLite." first; the three reasons next; the benchmark table last.
**Defined in:** [Communication rule](../plugin/a2v/rules/communication.md), [Explain](specs/explain.md)

## Q

### Quiet mode
**Plain:** a setting that hides amber flags until the digest and turns off motion and faces. Red flags still show.
**Example:** during a focus block, only `waiting_on_you` interrupts you.
**Defined in:** [Flag registry](specs/flags.md#rules), [Visual language](specs/visual-language.md#quiet-mode-and-accessibility)

## R

### Reviewed
**Plain:** the fourth step. Someone else approved, and blocking comments are resolved.
**Example:** a pull request approved with no open blocking threads.
**Defined in:** [Lifecycle](specs/lifecycle.md)

## S

### SCR
**Plain:** "Situation, Complication, Resolution": a three-part story used for briefs. What is true now, what is wrong or changed, what to do about it. The idea comes from consulting; Minto's own site describes a close cousin, SCQ, where the last part is a Question: [barbaraminto.com](https://www.barbaraminto.com/). No page that defines SCR itself was found, so there is no direct source link.
**Example:** "Build is green (situation). The deploy check never ran (complication). Run it before merging (resolution)."
**Defined in:** [Explain](specs/explain.md), [A2V method](METHOD.md#calm-practices)

### Session
**Plain:** one conversation with an agent such as Claude Code.
**Example:** a session titled from its first request: "add a retry to the uploader". Without a better name the item reads "Untitled session" with the date, or its repo and branch when known.
**Defined in:** [Work item model](specs/work-item-model.md#entities)

### Shipped
**Plain:** the fifth step. The work is merged and deployed.
**Example:** the pull request merged and the deploy job finished.
**Defined in:** [Lifecycle](specs/lifecycle.md)

### Signal
**Plain:** the method's word for a [flag](#flag).
**Example:** see Flag.
**Defined in:** [A2V method](METHOD.md#signals), [Flag registry](specs/flags.md)

### Spool
**Plain:** a local folder where hooks drop one line per event. The daemon reads it and turns it into database rows.
**Example:** `~/.vantage/spool/` fills with small files while Claude Code works.
**Defined in:** [Ingestion](specs/ingestion.md), [Operations](specs/operations.md)

### Stage
**Plain:** one of the six steps of the A2V track. An item's stage is the last step whose evidence exists.
**Example:** "Built · no proof yet" means the stage is Built and Proven is not reached.
**Defined in:** [Lifecycle](specs/lifecycle.md)

### Status line
**Plain:** a short line of glyphs in your terminal showing the current session's item.
**Example:** `●●◐○○○` for an item that is Built with no proof.
**Defined in:** [Status line](specs/status-line.md)

### Stop gate
**Plain:** a check when an agent stops. If it edited code and nothing proved it, you get a message naming the files. In warn mode it never blocks.
**Example:** "You changed `billing.ts`; no test ran after that edit."
**Defined in:** [Proof](specs/proof.md#the-gate)

## T

### Thrashing
**Plain:** a flag for loops of edit, fail, edit, fail on the same files, three or more times in a row. A sign the agent needs a reproduction instead of more guesses.
**Example:** the same test fails after four edits to `queue.ts`.
**Defined in:** [Behaviors and detectors](specs/behaviors-and-detectors.md), [Flag registry](specs/flags.md)

### Track page
**Plain:** the web page (`vantage open`) with one row per item: six dots, a stage label, flags and proof. The page that exists today.
**Example:** a row reads "Built · no proof yet" with a half filled amber dot.
**Defined in:** [UX](UX.md#track), [Web UI](specs/web-ui.md)

## U

### Unproven claim
**Plain:** a flag for an agent that said it was done after editing code, while no passing check ran after the last edit.
**Example:** "All fixed!" and no test run since the edit.
**Defined in:** [Proof](specs/proof.md), [Flag registry](specs/flags.md)

## V

### Verified
**Plain:** the sixth step. After deploy, post-deploy checks passed and monitoring stayed clean. Needs sources from later phases.
**Example:** a smoke test on production passed and no alert fired for 24 hours.
**Defined in:** [Lifecycle](specs/lifecycle.md#verified-in-detail)

## W

### Work item
**Plain:** one goal, shown as one row. Vantage tracks work items, not sessions: several sessions can feed one item.
**Example:** a branch `feat/login` worked on by three sessions is one item.
**Defined in:** [Work item model](specs/work-item-model.md)

### Worktree
**Plain:** an extra checkout of a git repo in its own folder, so several agents can work on different branches at once.
**Example:** `.claude/worktrees/login-fix` is a worktree of the main repo; it maps to one item.
**Defined in:** [Work item model](specs/work-item-model.md#boundary-rules)
