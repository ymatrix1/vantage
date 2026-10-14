---
description: Start the Vantage daemon in the background and show the Track page URL
allowed-tools: Bash(command -v vantage), Bash(printenv VANTAGE_CLI), Bash(printenv VANTAGE_HOME), Read(~/.vantage/install.json), Bash(vantage start*), Bash(node *packages/cli/dist/src/main.js start*), Bash(vantage open --print), Bash(node *packages/cli/dist/src/main.js open --print)
disable-model-invocation: true
---

# /vantage:start

Start the daemon without blocking this session.

1. Run `<cli> start` with the Bash tool's `run_in_background` set to true. Do not wait for it to finish; it runs until stopped. A second start is harmless: the single-instance guard prints that Vantage is already running and exits 1 without changing anything.
2. Then run `<cli> open --print` once (it only prints the URL and opens no browser). If it says Vantage is not running yet, read the background output once; if the daemon is still starting, say so and give 👉 `/vantage:open` in a few seconds.
3. On success: answer "Vantage is running", show the URL as printed, and say how to stop it (stop the background task or end this session's shell).

This command makes two CLI calls (start, then print the URL); nothing else is run.

**Find the CLI first** (read-only; stop at the first hit):

1. `command -v vantage`: if it prints a path, the CLI is `vantage`.
2. `printenv VANTAGE_CLI`: if set, the CLI is that command (for example `node /path/to/vantage/packages/cli/dist/src/main.js`).
3. Read `install.json` in the Vantage home (`$VANTAGE_HOME` from `printenv VANTAGE_HOME`, else `~/.vantage`). Take `hookCommand`; the checkout is the text before `/packages/`. The CLI is `node <checkout>/packages/cli/dist/src/main.js`.

If none works, stop and say: "I cannot find the Vantage CLI. Put `vantage` on your PATH, or set `VANTAGE_CLI` to `node <checkout>/packages/cli/dist/src/main.js`, then run this again." Do not guess a path.

**Rules**

- Run only the commands named here. Never run `uninstall` or `remove` (tell the user to run those themselves), never edit settings or any file by hand, and never read the `token` file.
- The token appears only inside the URL the CLI prints. Show that URL as printed; do not print the token anywhere else.
- Report in the A2V style: the answer first, then one line per check with a symbol (✅ ❌ ⚠️ ⬜ 👉), then one 👉 next step. Say what you did not check.
