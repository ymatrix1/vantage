---
description: Run vantage doctor and summarise PASS, WARN and FAIL with each fix
allowed-tools: Bash(command -v vantage), Bash(printenv VANTAGE_CLI), Bash(printenv VANTAGE_HOME), Read(~/.vantage/install.json), Bash(vantage doctor), Bash(node *packages/cli/dist/src/main.js doctor)
disable-model-invocation: true
---

# /vantage:doctor

Run exactly one CLI call: `<cli> doctor`. It is read-only.

Answer first: "All checks pass", "Warnings only" or "N failing checks". Then a table of every check: status (✅ PASS, ⚠️ WARN, ❌ FAIL), name, detail, and for each WARN or FAIL its fix line exactly as printed. FAIL means capture is broken and must be fixed; WARN is informational (for example, the daemon is not running). End with one 👉 next step, usually the first FAIL's fix, or `/vantage:start` when the daemon is down.

**Find the CLI first** (read-only; stop at the first hit):

1. `command -v vantage`: if it prints a path, the CLI is `vantage`.
2. `printenv VANTAGE_CLI`: if set, the CLI is that command (for example `node /path/to/vantage/packages/cli/dist/src/main.js`).
3. Read `install.json` in the Vantage home (`$VANTAGE_HOME` from `printenv VANTAGE_HOME`, else `~/.vantage`). Take `hookCommand`; the checkout is the text before `/packages/`. The CLI is `node <checkout>/packages/cli/dist/src/main.js`.

If none works, stop and say: "I cannot find the Vantage CLI. Put `vantage` on your PATH, or set `VANTAGE_CLI` to `node <checkout>/packages/cli/dist/src/main.js`, then run this again." Do not guess a path.

**Rules**

- Run only the commands named here. Never run `uninstall` or `remove` (tell the user to run those themselves), never edit settings or any file by hand, and never read the `token` file.
- The token appears only inside the URL the CLI prints. Show that URL as printed; do not print the token anywhere else.
- Report in the A2V style: the answer first, then one line per check with a symbol (✅ ❌ ⚠️ ⬜ 👉), then one 👉 next step. Say what you did not check.
