<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-wordmark-dark.svg">
    <img src="assets/logo-wordmark.svg" alt="Vantage" height="72">
  </picture>
</p>

# Vantage

## What is Vantage? (60 seconds)

Vantage runs on your own computer and shows how far each piece of your work has *really* got. When AI coding agents do much of the typing, it is easy to lose track of what was asked, what was built and what was actually tested. Vantage reads the traces your agents and git leave behind and draws one row per piece of work. A row moves forward only on evidence, such as a test that ran after the last edit. What an agent *says* never moves it. Nothing leaves your machine.

One example item, "add a retry to the uploader", moving along the track:

```
 Asked      Built       Proven       Reviewed    Shipped     Verified
   ●          ●           ◐            ○           ○           ○
 you asked  3 files     no test ran   waiting     not yet     not yet
            changed     after the edit
```

It sits at **Built · no proof yet** until a real test runs after the last edit; then the third dot fills in. New here? Read the [plain-language guide](docs/GUIDE.md), or try `vantage tour` (planned, see [first run](docs/specs/first-run.md#the-guided-tour)).

**Learn more**

| You are | Start here |
|---|---|
| A new user | [Guide](docs/GUIDE.md), then the [glossary](docs/GLOSSARY.md) (in Portuguese: [Guia](docs/pt-BR/GUIDE.md), [Glossário](docs/pt-BR/GLOSSARY.md)) |
| A contributor | [AGENTS.md](AGENTS.md), [architecture](docs/ARCHITECTURE.md), the [specs](docs/README.md#specs) |
| An agent installing it | [Install guide for agents](docs/install-for-agents.md) |
| Curious about the method | [A2V: Asked to Verified](docs/METHOD.md) |

All docs by audience: [docs/README.md](docs/README.md).

A personal, calm view of the true state of your work across AI coding agents, git, pull requests, CI/CD, monitoring, Jira or Linear, and Slack.

Vantage tracks **[work items](docs/GLOSSARY.md#work-item)**, not sessions. Each item moves along one evidence-based track, the **[A2V](docs/GLOSSARY.md#a2v) track** from the [A2V: Asked to Verified](docs/METHOD.md) method:

```
Asked → Built → Proven → Reviewed → Shipped → Verified
```

A card moves only on evidence: a git diff, a test or data check that ran after the last edit, a PR approval, a deploy, a clean monitoring window. What an agent *says* never moves a card.

## Status

**Phase 1 (the first usable slice) is built** for Claude Code and git: [hook](docs/GLOSSARY.md#hook) capture into a local [spool](docs/GLOSSARY.md#spool), a SQLite store, the git scanner, the [linker](docs/GLOSSARY.md#linker), the stage machine (Asked, Built, Proven), a `Stop` hook gate in warn mode, a terminal status line, a secured local Track page, a one-process [daemon](docs/GLOSSARY.md#daemon), and the installer. It has not been used day to day for a week yet (the Phase 1 exit, see the [roadmap](docs/ROADMAP.md)), and there is no published release yet (the release pipeline is built, see [RELEASING.md](RELEASING.md)). Reviewed, Shipped and Verified need sources from later phases.

Tested in CI on Windows and Ubuntu. Developed and run by hand on Windows first.

## Install

**Recommended: let Claude Code do it.** Open Claude Code in the repo you want to track and paste this:

```text
Install Vantage for this repo. Follow https://github.com/ymatrix1/vantage/blob/main/docs/install-for-agents.md exactly: check the prerequisites, get Vantage if it is not already on this machine (from a release, or a checkout build), show me the dry run first and wait for my OK, then install, start it, verify with vantage doctor, and tell me what changed and how to undo it.
```

The agent follows [the install guide](docs/install-for-agents.md) and stops at anything that fails. You stay in control at two points:

1. **Before anything changes**, it shows you `vantage add --dry-run`: the exact files it would touch, nothing written. It waits for your explicit yes.
2. **After the yes**, it installs (with a backup of your Claude Code `settings.json`), starts the daemon, runs `vantage doctor`, and tells you how to open the Track page.

It never adds tokens or credentials, never commits anything, and never edits your settings by hand: only `vantage add` writes, and every entry it writes can be removed exactly (see [Undo](#undo)).

**You need:** Node.js 22.5 or newer (Vantage uses the built-in `node:sqlite`), git and Claude Code, plus [pnpm](https://pnpm.io) if the agent has to build from a checkout. The agent checks these first and tells you what to install.

**Releases.** Once the first release is out, Vantage installs without a clone or a build: `npm install -g @ymatrix1/vantage` (or `npx @ymatrix1/vantage --version`) gives you the `vantage` command (`vantage --version` prints the version), and each [GitHub Release](https://github.com/ymatrix1/vantage/releases) carries the tarballs and a `SHA256SUMS` file. The agent tries the release first and falls back to a checkout. Until a release exists, the checkout path is the only one.

Then use Claude Code as usual. Open the Track page with `vantage open` (it opens `http://127.0.0.1:<port>` in your browser; `--print` only prints the URL). Items appear after the daemon's next pass, about 30 seconds.

<details>
<summary><strong>Prefer to do it by hand?</strong> The same steps, from a checkout.</summary>

```bash
git clone https://github.com/ymatrix1/vantage.git
cd vantage
pnpm install
pnpm build
```

Until the npm package exists, run the CLI as `node <checkout>/packages/cli/dist/src/main.js`; an alias keeps it short:

```bash
alias vantage='node /path/to/vantage/packages/cli/dist/src/main.js'
```

Then, from the repo you want to track:

| Step | Command | What it does |
|---|---|---|
| 1. Preview | `vantage add --dry-run` | Prints every file it would change; writes nothing |
| 2. Install | `vantage add --yes` | Backs up `settings.json`, adds the hooks, registers the repo |
| 3. Start | `vantage start` | Runs the daemon (leave it running in a terminal) |
| 4. Check | `vantage doctor` | PASS, WARN or FAIL with a fix line for each |
| 5. Open | `vantage open` | Opens the Track page |

</details>

## After you install

### Slash commands in Claude Code

Optional. Install the plugin (`claude plugin install vantage@vantage`, then a new session) to run the CLI from the chat:

| Command | Does |
|---|---|
| `/vantage:open` | opens the Track page |
| `/vantage:start` | starts the daemon in the background |
| `/vantage:doctor` | PASS, WARN and FAIL with fixes |
| `/vantage:status` | this repo's current item |
| `/vantage:add` | dry run, your yes, then install |

Claude Code names plugin commands `/<plugin>:<command>`, so there is no plain `/vantage open`. Details in [plugin/vantage](plugin/vantage/README.md).

### What the installer changes

| Where | What | Undo |
|---|---|---|
| Claude Code `settings.json` (`~/.claude`, or `CLAUDE_CONFIG_DIR`) | Eight hooks: seven async spool hooks (`SessionStart`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `Notification`, `PreCompact`, `SessionEnd`) and the synchronous `Stop` gate. Each command ends in `--vantage-managed`. | `vantage remove` or `vantage uninstall` removes only entries with that marker |
| Same file | The status line, **only if you have none**. If you already use one it is left alone and `add` says so. | same |
| `~/.vantage/config.toml` | The repo path in `repos = [...]` | `vantage remove [path]` |
| `~/.vantage/backups/` | A copy of `settings.json` before the first edit | kept for a manual restore |
| `~/.vantage/install.json` | A record of what `add` did | used by `remove` |
| Git hooks | Nothing, unless you pass `--git-hooks` (opt in, chained so your own hooks still run) | `vantage uninstall` |

Nothing inside your repo changes.

### What you will see

- **Track page** (`vantage open`): items grouped by attention, one row each with the six-dot track, proof state and [flags](docs/GLOSSARY.md#flag). Click a row for its trace (why it is where it is).
- **Status line** (if installed): a short glyph line for the current session's item.
- **[Stop gate](docs/GLOSSARY.md#stop-gate)** (warn mode): when an agent stops after editing code with no fresh test or data check, Claude Code shows a message naming the files and why. It never blocks. Set the mode with `VANTAGE_GATE_MODE=off|warn` or `proof_gate = "off"` in `config.toml`. Docs-only sessions never trigger it.

### Measuring it

`vantage stats` prints numbers about the Track page from the local store, read-only (it works with the daemon running or stopped, and never writes):

```bash
vantage stats                 # summary, plus the last 14 days
vantage stats --days 7        # one row per day, for the week review
vantage stats --since 7d      # only items and events from the last 7 days (also 24h or YYYY-MM-DD)
vantage stats --repo myrepo   # one repo, matched by name; repeat the command per repo
vantage stats --json          # the same numbers as JSON
```

It reports items (total and active in 24 h, 7 d and 30 d), readable titles versus fallback rows (`Session …` or `repo · branch · date`), [anchor](docs/GLOSSARY.md#anchor) kinds, session lineage (how many sessions sit on a real issue or branch item instead of a one-off `Session` row, sessions per item, sessions on a branch before and after the transcript-branch fix, [derived sessions](docs/GLOSSARY.md#derived-session), sub-agent runs), **[Needs you](docs/GLOSSARY.md#needs-you)** (total and last 48 h, split by flag kind), stages, how many edited items reached Proven and how many Built items lost their proof, which checks ran (by runner family, plus one count for commands not recognised as checks), events by source and per day, database size and the age of the last stage pass. Each line says what it means, and a ✅, ⚠️ or ❌ shows where it stands against a goal (for example Needs you under 10). The goals are starting points, not product rules.

The output holds numbers and fixed labels only: no titles, commands, paths or repo names (the one echo is the `--repo` text you typed), so it is safe to paste into an issue. Days are UTC.

### Classifying with Haiku

Optional and off by default. `vantage classify` asks **your own Claude Code** (`claude -p`, Haiku) to suggest titles, topics and groupings for items, so the Track page reads better. It runs in your Claude Code, so it uses your plan limits and Claude Code already sees this data. Status, stage and proof never come from the model: it only suggests text.

```bash
vantage classify --dry-run     # how many items, calls and bytes, and the exact message; calls nothing
vantage classify               # run in the background (needs the three switches below)
vantage classify accept        # preview, confirm, apply one batch (0.8 confidence and up)
vantage classify accept --all  # everything; also --kind titles|topics|groups and --repo NAME
vantage classify undo          # revert the last batch
```

Turn it on in `~/.vantage/config.toml`:

```toml
[engines.classify]
enabled = true
[data_policy]
outside_calls = true
[data_policy.allow]
transcripts = true
```

Per item it sends only the repo name, branch, the first sentence of the first request (300 characters, URLs and secret-looking text removed), up to 10 file names (no paths), counts and the current title. Never commands, transcripts or paths. Nothing is applied until you confirm a preview; every batch has one undo; `auto_accept` is off unless you set it. Details: [classify spec](docs/specs/classify.md).

### Where your data lives

All local, under `~/.vantage` (or `VANTAGE_HOME`): `spool/` (one line per hook event, **including the tool input Claude Code passes to the hook**), `vantage.db` (events, links, stages, proofs), `token` (the Track page token), `status.json` and `health.json`. **Request titles are stored locally:** the first sentence of a session's first request (cleaned of paths, URLs and anything that looks like a secret, at most 80 characters) becomes that session's item title and is kept in `vantage.db`, nowhere else. Turn it off with `item_titles_from_requests = false` in `config.toml`, see what is stored with `vantage titles`, and delete it with `vantage titles clear`. The daemon listens on `127.0.0.1` only, with a token and Host and Origin checks. Nothing leaves the machine, and no outside model is called. See [privacy](docs/ARCHITECTURE.md#privacy) and the [data policy](docs/specs/settings.md).

### Undo

```bash
vantage remove        # stop tracking this repo
vantage uninstall     # remove Vantage's hooks and status line from settings.json
```

Neither deletes `~/.vantage`. Delete that folder yourself if you want the data gone.

### If something is off

| Symptom | Fix |
|---|---|
| `vantage doctor` shows FAIL for hooks | Run `vantage add --dry-run` again, then `vantage add --yes`; rebuild with `pnpm build` if a hook file is missing |
| "The UI is not built" | `pnpm build` |
| "Port 4317 is in use" | `vantage start --port 4400` (or `VANTAGE_PORT`) |
| "Vantage is already running" | One daemon per `~/.vantage`; use `vantage open` |
| The Track page is empty | Use Claude Code in a registered repo and wait about 30 seconds; check `vantage doctor` |
| Stop messages feel wrong | Set `VANTAGE_GATE_MODE=off` and tell us which case it got wrong |

## Developing

```bash
pnpm check                       # type check, lint, format, tests, fixture scrub
python tools/check_docs.py       # links, decision format and status, privacy scan
python -m unittest discover -s tools -p "test_*.py"
```

Packages: `core` (pure logic), `daemon`, `hooks`, `hooks-native` (Rust spool hook, built in CI), `cli`, `ui`. Read [AGENTS.md](AGENTS.md) first; tasks live in [beans](https://github.com/hmans/beans) under `.beans/`.

## Documents

| Doc | What it covers |
|---|---|
| [A2V method](docs/METHOD.md) | The method Vantage implements: track, five rules, proof levels, [signals](docs/GLOSSARY.md#signal) |
| [PRD](docs/PRD.md) | Problem, pains, user, goals, non-goals, success metrics |
| [UX](docs/UX.md) | Surfaces (Focus, Board, Item, Ambient) and UX rules |
| [Architecture](docs/ARCHITECTURE.md) | Sources, event store, linker, scorers, surfaces, privacy |
| [Spec: lifecycle](docs/specs/lifecycle.md) | Stage gates, backward moves, flags, proof rules |
| [Spec: work item model](docs/specs/work-item-model.md) | Entities, anchors, linking rules |
| [Spec: flag registry](docs/specs/flags.md) | Every flag: trigger, severity, icon, one action |
| [Spec: proof](docs/specs/proof.md) | Proof types, strength levels, freshness, fake proof detection, the gate |
| [Spec: behaviors and detectors](docs/specs/behaviors-and-detectors.md) | Behavior sources, AI-decided and commitment detectors, resume with context |
| [Spec: data schema](docs/specs/data-schema.md) | Tables, immutability, migrations, merge linking |
| [Spec: visual language](docs/specs/visual-language.md) | Dot alphabet, proof shine, dot characters, [landscape](docs/GLOSSARY.md#landscape) home, calm gamification |
| [Spec: Explain](docs/specs/explain.md) | [Answer-first](docs/GLOSSARY.md#answer-first) briefs, [SCR](docs/GLOSSARY.md#scr), [MECE](docs/GLOSSARY.md#mece) [issue trees](docs/GLOSSARY.md#issue-tree) with click-to-expand, via the connected agent |
| [Spec: pings](docs/specs/pings.md) | Who you owe a reply, who to nudge, who to tell it's done |
| [Spec: status line](docs/specs/status-line.md) | Text glyphs for the dot alphabet in the terminal |
| [Spec: first run](docs/specs/first-run.md) | `vantage init`, first view, one-time legend, demo mode |
| [Spec: decision log](docs/specs/decision-log.md) | Every AI or person decision, with five fields, who and status |
| [Spec: web UI](docs/specs/web-ui.md) | Navigation, screen states, keyboard map, API, performance budgets |
| [Spec: settings](docs/specs/settings.md) | Engines, budgets and the data policy for outside models, all off by default |
| [Spec: CI/CD](docs/specs/ci.md) | Docs checks now, code checks in Phase 1, releases later |
| [Mockups](docs/mockups/index.html) | Static HTML mockups with synthetic data |
| [Spec: scoring](docs/specs/scoring.md) | Priority, difficulty, spread, staleness |
| [Spec: ingestion](docs/specs/ingestion.md) | How each source is listened to: push, polling, cursors, relay |
| [Spec: operations](docs/specs/operations.md) | Identity, config, secrets, seen state, daemon, health, quality |
| [Roadmap](docs/ROADMAP.md) | Build phases and exit criteria |
| [Decisions](docs/DECISIONS.md) | Decision log |
| [Open questions](docs/OPEN-QUESTIONS.md) | What still needs deciding |
| [Landscape](docs/research/landscape.md) | Existing tools and why they don't cover this |
| [Research: Vibe Kanban](docs/research/vibe-kanban.md) | How Vibe Kanban drives Claude Code, and what it means for Vantage |

The **A2V plugin** in [`plugin/a2v/`](plugin/a2v/) packages the method for any project: a communication rule, an output style, and the skills `explain-top-down`, `prove-it`, `record-decision`, `handoff`, `land-the-day`, `answer-review`, `close-the-loop` and `plan-task`. Install it with `/plugin marketplace add ymatrix1/vantage`, then `/plugin install a2v@vantage`.

Agent instructions: [AGENTS.md](AGENTS.md) (canonical), rules in `.agents/rules/`, skills in `.agents/skills/`. Tasks are tracked with [beans](https://github.com/hmans/beans) in `.beans/`.
