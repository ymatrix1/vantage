<!--
Style note: this guide is for lay readers and newcomers, so it uses full, friendly sentences instead of the compact
[answer-first](GLOSSARY.md#answer-first) style of the specs (plugin/a2v/rules/communication.md). Technical detail stays in the specs; every
unfamiliar word links to the glossary.
-->

# Vantage guide

In Portuguese: [Guia](pt-BR/GUIDE.md). Words that link to the [glossary](GLOSSARY.md) are explained there in one line.

## What Vantage is

Vantage is a small program that runs on your own computer and shows, honestly, how far each piece of your work has really got. When AI coding agents such as Claude Code do much of the typing, it is easy to lose track of what was asked, what was built, and what was actually tested. Vantage watches the traces those tools leave (agent sessions, git, and later pull requests and deploys) and draws one row per piece of work. A row moves forward only when there is evidence, never because an agent said "done".

## The problem, in three everyday examples

1. **"It's fixed!"** An agent says it fixed a bug and you move on. Nobody ran a test. Two days later it breaks. Vantage shows that row as [built](GLOSSARY.md#built) but not [proven](GLOSSARY.md#proven).
2. **Where was I?** You come back after the weekend with six chat windows open. Which one has uncommitted changes? Which one only discussed an idea? Vantage lists them with their real state.
3. **Quiet waiting.** One session has been waiting for your "yes" for an hour, and you never saw it. Vantage puts it in [Needs you](GLOSSARY.md#needs-you).

## How it works, in five steps

1. **Hooks listen.** Small commands ([hooks](GLOSSARY.md#hook)) that Claude Code and git run write one line per event into a local folder, the [spool](GLOSSARY.md#spool). They never slow your work.
2. **The daemon reads.** A background program, the [daemon](GLOSSARY.md#daemon) (`vantage start`), turns those lines into a local database.
3. **The [linker](GLOSSARY.md#linker) groups.** Events about the same ticket, branch or [worktree](GLOSSARY.md#worktree) are tied together into one [work item](GLOSSARY.md#work-item) (see [anchor](GLOSSARY.md#anchor)).
4. **The stage is derived.** Each item gets a step on the six-step track, based only on evidence.
5. **You look.** Open the Track page with `vantage open`.

Everything stays on your machine.

## How to read the Track page

Each row is one work item. From left to right:

- **The six dots** are the six steps: Asked, Built, Proven, Reviewed, Shipped, Verified. A filled green dot means done. A thick blue ring means in progress. A half filled amber dot means "built, no proof". A ring with a red badge means [needs you](GLOSSARY.md#needs-you). A short gray dash means "skipped or not set up", and a thin pale ring means "not yet". Shape comes first, color second, so it works for color blindness too.
- **The stage label** next to the dots says it in words, for example "Built · no proof yet".
- **[Flags](GLOSSARY.md#flag)** are warnings with one suggested action each, for example [unproven claim](GLOSSARY.md#unproven-claim) or [thrashing](GLOSSARY.md#thrashing).
- **Proof** shows how strong the evidence is. More green arcs on the Proven dot means stronger proof (see [proof level](GLOSSARY.md#proof-level)).
- *[Needs you](GLOSSARY.md#needs-you)* is the group at the top: items waiting for something only you can do.

Click a row to see why it is where it is.

## What Vantage never does

- It never moves a card because an agent said so. Only evidence moves cards.
- Nothing leaves your machine unless you switch something on. No outside model is called by default.
- It never commits for you, never edits your repo, and never stores passwords or tokens.
- It never blocks your agent: the stop check only warns.

## A five-minute daily routine

1. **Start:** `vantage start` in a terminal you leave open (about 10 seconds).
2. **Open:** `vantage open`, then look at [Needs you](GLOSSARY.md#needs-you) first (1 minute).
3. **Act on each flag:** ask for proof, answer the waiting session, or park what you will not touch today (2 minutes).
4. **Glance at the rest:** anything amber that is old? Resume it, park it or drop it (1 minute).
5. **Check health when something looks odd:** `vantage doctor` (30 seconds).

## Frequently asked questions

**1. Why is my item "Built" and not "Proven"?**
No check has run after your last code edit, or the check was too weak to count (it printed text but could not fail, or ran zero tests). Run the real test now and wait for the next pass, about 30 seconds.

**2. What is a flag?**
A warning on an item with one suggested action. The [flag list](specs/flags.md) names every one. Amber waits for a digest; red interrupts.

**3. Why is there an item called "Session abc12345"?**
That session had edits but no ticket, branch or readable first request to name it. The name is the first characters of the session id. A session that only continues another one (a resume or a clear) joins its parent's item instead.

**4. Why did my Proven item go back to Built?**
Proof belongs to the code it checked. You edited the code afterwards, so the proof expired. Run the check again.

**5. Does Vantage read my code or my chats?**
It stores what the hooks pass it, including tool inputs, locally. The first sentence of a session's first request is kept as a title, cleaned of paths and secrets. You can turn titles off with `item_titles_from_requests = false` and delete them with `vantage titles clear`.

**6. Where is my data?**
In `~/.vantage` (or the folder named by `VANTAGE_HOME`): `spool/`, `vantage.db`, `token`, `status.json`, `health.json`. Nothing is sent anywhere.

**7. How do I undo it?**
`vantage remove` stops tracking this repo. `vantage uninstall` removes the hooks and status line it added (only entries marked `--vantage-managed`). Delete `~/.vantage` yourself to erase the data.

**8. The Track page is empty.**
Use Claude Code in a repo you registered with `vantage add`, wait about 30 seconds, and run `vantage doctor`.

**9. Can an agent cheat the proof?**
It can say whatever it likes; that moves nothing. A command that cannot fail (`echo ok`, `pnpm test || true`) does not count, and neither does a run of zero tests.

**10. Do I have to know the [A2V](GLOSSARY.md#a2v) method?**
No. The [method page](METHOD.md) explains where the ideas come from, for the curious. To try Vantage on made-up data first, run `vantage tour` (planned, see the [first-run spec](specs/first-run.md#the-guided-tour)).

Next: [glossary](GLOSSARY.md), [all docs by audience](README.md).
