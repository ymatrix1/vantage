---
description: "Show the current session's Vantage item (stage, proof, flags)"
allowed-tools: Bash(printenv VANTAGE_HOME), Read(~/.vantage/status.json)
disable-model-invocation: true
---

# /vantage:status

Read-only. Make no CLI call and no server call: read `status.json` in the Vantage home (`$VANTAGE_HOME` from `printenv VANTAGE_HOME`, else `~/.vantage`). It is the file the status line reads: `{v, writtenAt, needsYou, pings, sessions: {<session_id>: {stage, proofStatus, proofLevel, docsOnly, repo, title, flags}}}`.

1. If the file is missing: say Vantage has not run yet, 👉 `/vantage:start`.
2. If `writtenAt` is more than 5 minutes old: say the data is stale (the daemon is probably stopped), 👉 `/vantage:start`, and still show what is there, marked stale.
3. Pick the sessions whose `repo` matches this working directory's repo name (the last folder of the git root). You cannot see your own session id, so list up to 3, most relevant first, and say the match is by repo.
4. For each: title, stage (Asked, Built, Proven), proof (`proofStatus`, level, or "docs only, proof not required"), and each flag kind. Add the global `needsYou` count.

Answer first, e.g. "Checkout fixes is Built, not proven (1 flag)." Mark each line ✅ proven, ⚠️ built without fresh proof, ❌ failed proof or flag open. 👉 One next step, such as running the project's checks.

**Rules**

- Run only the commands named here. Never run `uninstall` or `remove` (tell the user to run those themselves), never edit settings or any file by hand, and never read the `token` file.
- The token appears only inside the URL the CLI prints. Show that URL as printed; do not print the token anywhere else.
- Report in the A2V style: the answer first, then one line per check with a symbol (✅ ❌ ⚠️ ⬜ 👉), then one 👉 next step. Say what you did not check.
