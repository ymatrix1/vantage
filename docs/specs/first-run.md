# Spec: first run

> **Status:** draft.

> **Terms:** [backfill](../GLOSSARY.md#backfill), [daemon](../GLOSSARY.md#daemon), [hook](../GLOSSARY.md#hook), [landscape](../GLOSSARY.md#landscape), [Needs you](../GLOSSARY.md#needs-you), [signal](../GLOSSARY.md#signal), [spool](../GLOSSARY.md#spool), [worktree](../GLOSSARY.md#worktree), [flag](../GLOSSARY.md#flag), [thrashing](../GLOSSARY.md#thrashing), [unproven claim](../GLOSSARY.md#unproven-claim), [derived session](../GLOSSARY.md#derived-session). Plain-language definitions are in the [glossary](../GLOSSARY.md).

The first ten minutes decide whether Vantage gets used. This spec covers install to first useful view.

## `vantage init`

Run once, from any repo:

1. **Detect** agents and sources available on this machine: Claude Code transcripts, Codex sessions, `gh` login, git repos and worktrees. Show what was found.
2. **Choose repos** to watch (default: repos with agent sessions in the last 30 days). Suggest Work and Personal contexts from GitHub orgs and paths (Q16).
3. **Install hooks** (Claude Code, git), showing exactly which files change. Uninstall is one command.
4. **Ask for working hours and digest times** (defaults shown, Enter to accept).
5. **Backfill** the last 14 days in the background, with a progress line. The UI opens before backfill ends.
6. **Open the UI** with a local token in the URL fragment (D32).

Nothing is sent anywhere during init. Remote sources (Slack, Jira, Linear, monitoring) are offered later, one at a time, from the Sources page.

## Adding an existing repo

One command from inside any repo, existing work included:

```bash
npx vantage add
```

Or from inside Claude Code: `claude plugin install vantage@vantage` (the marketplace is also named `vantage`), then `/vantage:add`. Claude Code namespaces plugin commands as `/<plugin>:<command>`, so there is no plain `/vantage add` ([D83](../DECISIONS.md), proposed). `/vantage:add` runs the dry run, shows the plan, waits for an explicit yes in chat, and only then runs `vantage add --yes`. Siblings: `/vantage:open`, `:start`, `:doctor`, `:status`; see [plugin/vantage](../../plugin/vantage/README.md).

What it does, in under a minute:

1. **Starts Vantage** if it isn't running (installs it the first time, then runs the `vantage init` questions once per machine).
2. **Registers the repo** and finds its worktrees automatically.
3. **Hooks are installed once per machine, not per repo:** Claude Code hooks at the user level and git hooks through a global `core.hooksPath` that chains the repo's own hooks (Husky, Lefthook, plain `.git/hooks`). Existing hooks keep working.
4. **Backfills this repo's history:** agent sessions whose working directory is the repo or one of its worktrees, plus git history, for the last 14 days.
5. **Opens the landscape** filtered to this repo.

What `vantage add` does today (Phase 1, [D79](../DECISIONS.md)): registers eight Claude Code hooks (seven async spool hooks and the synchronous `Stop` gate) and the status line in the user's Claude Code `settings.json`, and adds the repo to `repos` in `config.toml`. Every command it registers carries the `--vantage-managed` marker, and `install.json` records the change. It asks first (`--yes` skips the question; with no terminal it refuses without it), backs up an existing `settings.json`, is idempotent, merges without touching other hooks, never replaces another status line, and refuses unreadable settings. Global git hooks are opt-in with `--git-hooks`: wrapper scripts that run the repo's own hook after Vantage's (plain `.git/hooks` and Lefthook shims chain; Husky sets a repo-local `core.hooksPath`, so it is detected and reported, not chained). The hook it registers is the native binary when one is found (the per-OS package, then `packages/hooks-native/target/release`), registered as `"<binary>" "<hooks bin.js>" --vantage-managed`, else `node <hooks bin.js>`; `--dry-run` shows which and why, and `vantage doctor` reports native or node and warns when the Node hook is registered while a native binary exists (`vantage add --yes` re-registers, D80). It does not start the daemon, backfill or open the UI yet: run `vantage start`, then `vantage doctor`.

Guarantees:

- **Nothing in the repo changes by default.** No files written, nothing committed.
- `--dry-run` prints every change before making it.
- `--team` (opt-in) writes a small `.vantage/project.toml` with shared settings (project name, deploy signal, proof commands, monitoring service names) that teammates can commit.
- `vantage remove` unregisters the repo; `vantage uninstall` removes everything (see [operations](operations.md#upgrades-backup-and-uninstall)).

## Installing with a prompt

The end-goal install is a prompt the user pastes into their agent (Claude Code or Codex). The agent follows [install-for-agents.md](../install-for-agents.md): prerequisites, a dry run shown to the user, explicit OK, install, `vantage doctor`, and a short report with how to undo it. The agent never adds credentials and never commits.

## The guided tour

> **Status:** planned (bean `vantage-u1hk`). Text for the Track page's first-run state is specified here so the Track UI can build it.

`vantage tour` is an interactive walkthrough in the terminal. It needs no network and no real data, and uses only synthetic examples.

| Step | Topic |
|---|---|
| 1 | What Vantage shows and why |
| 2 | The six stages, with one worked example |
| 3 | The dot shapes and what the page's legend says |
| 4 | Proof: what counts (a test run after the last edit) and what does not (`pnpm test \|\| true`) |
| 5 | Flags and Needs you |
| 6 | How to read an item: title, branch, evidence per stage |
| 7 | Daily commands: `start`, `open`, `doctor`, `stats`, `add`, `remove` |
| 8 | Where your data lives, what leaves the machine (nothing by default) and how to undo |

Each step is about 8 lines, shows a small synthetic example and waits for Enter.

| Option | Effect |
|---|---|
| `--lang pt\|en` | Language; default from the system locale |
| `--no-pause` | Print every step without waiting (pipes, tests) |
| `--step N` | Start at step N |
| `--demo` | Build a temporary synthetic Vantage home, start the daemon on a free port against it, print the URL (token in the fragment) and clean up on exit |

The demo home holds about 12 invented items: every stage, a thrashing flag, an unproven claim, a group of derived sessions and a forgotten item, all with clearly fake names and repos. It never reads or writes the real `VANTAGE_HOME`. The tour text lives in one data file per language (`packages/cli/src/tour/`), so it can be tested and translated. `vantage add` ends with one line: "New here? Run `vantage tour`".

### First-run state of the Track page

When the Track page has no items, it shows exactly this (the Track UI owns the page; this is the text and command it should use):

```
No work yet.
Start a Claude Code session in a repo you added with `vantage add`; it appears here within a minute.
New here? Run `vantage tour`, or open the guide: docs/GUIDE.md
```

Three lines, and `vantage tour` as the command. The page may link "guide" to the repository's `docs/GUIDE.md`.

## First view

- **Backfill running:** the landscape fills in as items are found, with a quiet "reading the last 14 days" line.
- **Nothing found:** an invitation, not an apology: "Start a Claude Code session in one of your repos and it will appear here."
- **Items found:** the normal landscape, plus the one-time legend below.

## One-time legend

A short overlay, shown once and reachable later with `?`:

1. "Each dot is a piece of work." (points at a dot)
2. "The ring is its six steps, from asked to verified." (animates one ring)
3. "Close means it needs you; the sky is what you finished." (points at the bands)
4. "Press `e` on anything for an explanation."

Four steps, one sentence each, skippable.

## Sample mode

`vantage demo` opens the UI on synthetic data (the mockup data set) without touching real logs, for trying the UI or showing it to someone.

## Success check

Within 10 minutes of `vantage init`, the user sees at least one real item on the landscape with a correct stage.
