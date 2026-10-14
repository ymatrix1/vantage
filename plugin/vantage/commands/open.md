---
description: Open the Vantage Track page in your browser and show its URL
allowed-tools: Bash(command -v vantage), Bash(printenv VANTAGE_CLI), Bash(printenv VANTAGE_HOME), Read(~/.vantage/install.json), Bash(vantage open*), Bash(node *packages/cli/dist/src/main.js open*)
disable-model-invocation: true
---

# /vantage:open

Open the Track page. Run exactly one CLI call: `<cli> open`. It prints `http://127.0.0.1:<port>/#token=<token>` and opens it in the default browser.

- On success: answer "Track page opened", show the URL as printed, and say the link works only on this machine.
- If the CLI says Vantage is not running: say so and give 👉 `/vantage:start`.

**Find the CLI first** (read-only; stop at the first hit):

1. `command -v vantage`: if it prints a path, the CLI is `vantage`.
2. `printenv VANTAGE_CLI`: if set, the CLI is that command (for example `node /path/to/vantage/packages/cli/dist/src/main.js`).
3. Read `install.json` in the Vantage home (`$VANTAGE_HOME` from `printenv VANTAGE_HOME`, else `~/.vantage`). Take `hookCommand`; the checkout is the text before `/packages/`. The CLI is `node <checkout>/packages/cli/dist/src/main.js`.

If none works, stop and say: "I cannot find the Vantage CLI. Put `vantage` on your PATH, or set `VANTAGE_CLI` to `node <checkout>/packages/cli/dist/src/main.js`, then run this again." Do not guess a path.

**Rules**

- Run only the commands named here. Never run `uninstall` or `remove` (tell the user to run those themselves), never edit settings or any file by hand, and never read the `token` file.
- The token appears only inside the URL the CLI prints. Show that URL as printed; do not print the token anywhere else.
- Report in the A2V style: the answer first, then one line per check with a symbol (✅ ❌ ⚠️ ⬜ 👉), then one 👉 next step. Say what you did not check.
