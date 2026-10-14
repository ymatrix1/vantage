---
description: "Add this repo to Vantage: dry run first, then install only after your explicit yes"
argument-hint: "[--git-hooks]"
allowed-tools: Bash(command -v vantage), Bash(printenv VANTAGE_CLI), Bash(printenv VANTAGE_HOME), Read(~/.vantage/install.json), Bash(vantage add --dry-run*), Bash(node *packages/cli/dist/src/main.js add --dry-run*)
disable-model-invocation: true
---

# /vantage:add

Add the current repo. This edits the user's Claude Code `settings.json` and Vantage's config, so it needs an explicit yes (D79).

1. Run exactly `<cli> add --dry-run` from the repo root (append `--git-hooks` only if the user passed it as the argument: $ARGUMENTS). It writes nothing.
2. Show the plan as the CLI printed it: files that would change, hooks, status line, repo, backup. Say what is unchanged.
3. Ask: "Apply this? Reply yes to continue." **Stop and wait for the user's answer in chat.** Anything other than a clear yes means stop; do not run step 4.
4. Only after an explicit yes in the user's next message, run `<cli> add --yes` (with `--git-hooks` only if used in step 1). This command is deliberately not pre-approved, so Claude Code may ask for permission again; that is the second gate.
5. Report the result in the A2V style and give 👉 `/vantage:doctor`, then `/vantage:start`.

If the dry run fails (for example unreadable `settings.json`), report it and stop.

**Find the CLI first** (read-only; stop at the first hit):

1. `command -v vantage`: if it prints a path, the CLI is `vantage`.
2. `printenv VANTAGE_CLI`: if set, the CLI is that command (for example `node /path/to/vantage/packages/cli/dist/src/main.js`).
3. Read `install.json` in the Vantage home (`$VANTAGE_HOME` from `printenv VANTAGE_HOME`, else `~/.vantage`). Take `hookCommand`; the checkout is the text before `/packages/`. The CLI is `node <checkout>/packages/cli/dist/src/main.js`.

If none works, stop and say: "I cannot find the Vantage CLI. Put `vantage` on your PATH, or set `VANTAGE_CLI` to `node <checkout>/packages/cli/dist/src/main.js`, then run this again." Do not guess a path.

**Rules**

- Run only the commands named here. Never run `uninstall` or `remove` (tell the user to run those themselves), never edit settings or any file by hand, and never read the `token` file.
- The token appears only inside the URL the CLI prints. Show that URL as printed; do not print the token anywhere else.
- Report in the A2V style: the answer first, then one line per check with a symbol (✅ ❌ ⚠️ ⬜ 👉), then one 👉 next step. Say what you did not check.
