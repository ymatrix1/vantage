# Vantage plugin

Slash commands for [Vantage](../../README.md) inside Claude Code. Each one wraps the `vantage` CLI; everything stays on your machine.

## Install

```bash
claude plugin marketplace add ymatrix1/vantage
claude plugin install vantage@vantage
```

Then **start a new session**: plugins load at session start. (The marketplace and the plugin are both named `vantage`, hence `vantage@vantage`.)

## Commands

Claude Code namespaces plugin commands as `/<plugin>:<command>`, so the form is **`/vantage:open`**, not `/vantage open`. The docs describe no plugin form that takes `open` as an argument, so none is offered (D83).

| Command | What it does | Runs |
|---|---|---|
| `/vantage:open` | Opens the Track page and shows its URL | `vantage open` |
| `/vantage:start` | Starts the daemon in the background (a second start is harmless) and shows the URL | `vantage start`, then `vantage open --print` |
| `/vantage:doctor` | Summarises PASS, WARN and FAIL with each fix line | `vantage doctor` |
| `/vantage:status` | Shows this repo's session item: stage, proof, flags | reads `status.json`, no CLI call |
| `/vantage:add` | Shows the dry-run plan, waits for your yes in chat, then installs | `vantage add --dry-run`, then `vantage add --yes` |

All five are `disable-model-invocation`: only you start them. `add` is the only one that changes your settings (D79), and `add --yes` is deliberately not pre-approved, so you may be asked twice.

## Finding the CLI

Each command looks in this order, read-only: `vantage` on `PATH`; the `VANTAGE_CLI` variable (for example `node /path/to/vantage/packages/cli/dist/src/main.js`); then `install.json` in `~/.vantage` (or `$VANTAGE_HOME`), whose `hookCommand` names the checkout. If none works the command stops and says how to set `VANTAGE_CLI`.

## What it never does

It never runs `uninstall` or `remove` (run those yourself), edits settings by hand, reads the token file, or shows the token outside the URL the CLI prints. `allowed-tools` in each file lists the exact commands it may run; `tools/plugin_check.py` fails CI on unrestricted Bash.

## Not verified

The command files are checked for structure only. Running each one in a real Claude Code session touches your real config and is bean `vantage-u902`'s open box.
