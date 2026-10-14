<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-wordmark-dark.svg">
    <img src="assets/logo-wordmark.svg" alt="Vantage" height="72">
  </picture>
</p>

# Vantage

A personal, calm view of the true state of your work across AI coding agents, git, pull requests, CI/CD, monitoring, Jira or Linear, and Slack.

Vantage tracks **work items**, not sessions. Each item moves along one evidence-based track, the **A2V track** from the [A2V: Asked to Verified](docs/METHOD.md) method:

```
Asked → Built → Proven → Reviewed → Shipped → Verified
```

A card moves only on evidence: a git diff, a test or data check that ran after the last edit, a PR approval, a deploy, a clean monitoring window. What an agent *says* never moves a card.

## Status

**Phase 1 (the first usable slice) is built** for Claude Code and git: hook capture into a local spool, a SQLite store, the git scanner, the linker, the stage machine (Asked, Built, Proven), a `Stop` hook gate in warn mode, a terminal status line, a secured local Track page, a one-process daemon, and the installer. It has not been used day to day for a week yet (the Phase 1 exit, see the [roadmap](docs/ROADMAP.md)), and it is not published to npm. Reviewed, Shipped and Verified need sources from later phases.

Tested in CI on Windows and Ubuntu. Developed and run by hand on Windows first.

## Quick start (from a checkout)

**You need:** Node.js 22.5 or newer (Vantage uses the built-in `node:sqlite`), [pnpm](https://pnpm.io), git, and Claude Code.

```bash
git clone https://github.com/ymatrix1/vantage.git
cd vantage
pnpm install
pnpm build
```

Until the npm package exists, run the CLI as `node <checkout>/packages/cli/dist/src/main.js`. The steps below call it `vantage`; an alias keeps it short:

```bash
alias vantage='node /path/to/vantage/packages/cli/dist/src/main.js'
```

1. **See what an install would change.** From the repo you want to track:

   ```bash
   vantage add --dry-run
   ```

   It prints every file it would touch and writes nothing.
2. **Install.** Read the plan, then:

   ```bash
   vantage add --yes
   ```

   It backs up your Claude Code `settings.json` first, adds the hooks, and registers the repo.
3. **Start the daemon** (leave it running in a terminal):

   ```bash
   vantage start
   ```
4. **Check it.** In another terminal: `vantage doctor`. A FAIL names what to fix; a WARN is informational (for example, "daemon not running").
5. **Open the Track page:** `vantage open` (use `--print` to only print the URL).
6. **Use Claude Code as usual.** Items appear after the daemon's next pass (about 30 seconds).

Or hand the whole thing to an agent. Paste this into Claude Code in your repo:

```text
Install Vantage in this repo. Follow https://github.com/ymatrix1/vantage/blob/main/docs/install-for-agents.md exactly: show me the dry run first, wait for my OK, then install, verify with vantage doctor, and tell me what changed.
```

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

- **Track page** (`vantage open`): items grouped by attention, one row each with the six-dot track, proof state and flags. Click a row for its trace (why it is where it is).
- **Status line** (if installed): a short glyph line for the current session's item.
- **Stop gate** (warn mode): when an agent stops after editing code with no fresh test or data check, Claude Code shows a message naming the files and why. It never blocks. Set the mode with `VANTAGE_GATE_MODE=off|warn` or `proof_gate = "off"` in `config.toml`. Docs-only sessions never trigger it.

### Where your data lives

All local, under `~/.vantage` (or `VANTAGE_HOME`): `spool/` (one line per hook event, **including the tool input Claude Code passes to the hook**), `vantage.db` (events, links, stages, proofs), `token` (the Track page token), `status.json` and `health.json`. The daemon listens on `127.0.0.1` only, with a token and Host and Origin checks. Nothing leaves the machine, and no outside model is called. See [privacy](docs/ARCHITECTURE.md#privacy) and the [data policy](docs/specs/settings.md).

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
| [A2V method](docs/METHOD.md) | The method Vantage implements: track, five rules, proof levels, signals |
| [PRD](docs/PRD.md) | Problem, pains, user, goals, non-goals, success metrics |
| [UX](docs/UX.md) | Surfaces (Focus, Board, Item, Ambient) and UX rules |
| [Architecture](docs/ARCHITECTURE.md) | Sources, event store, linker, scorers, surfaces, privacy |
| [Spec: lifecycle](docs/specs/lifecycle.md) | Stage gates, backward moves, flags, proof rules |
| [Spec: work item model](docs/specs/work-item-model.md) | Entities, anchors, linking rules |
| [Spec: flag registry](docs/specs/flags.md) | Every flag: trigger, severity, icon, one action |
| [Spec: proof](docs/specs/proof.md) | Proof types, strength levels, freshness, fake proof detection, the gate |
| [Spec: behaviors and detectors](docs/specs/behaviors-and-detectors.md) | Behavior sources, AI-decided and commitment detectors, resume with context |
| [Spec: data schema](docs/specs/data-schema.md) | Tables, immutability, migrations, merge linking |
| [Spec: visual language](docs/specs/visual-language.md) | Dot alphabet, proof shine, dot characters, landscape home, calm gamification |
| [Spec: Explain](docs/specs/explain.md) | Answer-first briefs, SCR, MECE issue trees with click-to-expand, via the connected agent |
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
