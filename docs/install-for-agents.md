# Installing Vantage (instructions for AI agents)

> **Status:** works for Claude Code from a built checkout (`pnpm install && pnpm build`). The release install path (`npm install -g @ymatrix1/vantage`, or a GitHub Release tarball) is built but **no release exists yet**: use it only after `npm view @ymatrix1/vantage version` or the latest GitHub Release answers. Not yet run end to end on a fresh machine. Codex steps are not written because Vantage does not install Codex hooks yet. The commands below are `vantage ...`; with a checkout, run them as `node <checkout>/packages/cli/dist/src/main.js ...`.

This file is written for an AI coding agent (Claude Code or similar) that a user asked to install Vantage. Follow the steps in order and stop at any step that fails.

## The prompt users paste

```text
Install Vantage for this repo. Follow https://github.com/ymatrix1/vantage/blob/main/docs/install-for-agents.md exactly: check the prerequisites, get Vantage if it is not already on this machine (from a release, or a checkout build), show me the dry run first and wait for my OK, then install, start it, verify with vantage doctor, and tell me what changed and how to undo it.
```

## Steps for the agent

1. **Check prerequisites.** Node.js 22.5 or newer (`node --version`; Vantage uses the built-in `node:sqlite`), pnpm (`pnpm --version`) and git. If something is missing, tell the user what to install and stop.
2. **Get Vantage** (skip what already exists; `vantage --version` tells you what is installed). Try these in order and use the first that works:
   1. **npm release.** If `npm view @ymatrix1/vantage version` prints a version, run `npm install -g @ymatrix1/vantage`. `vantage` is now on the PATH. It needs no clone and no build.
   2. **GitHub Release.** If a release exists at https://github.com/ymatrix1/vantage/releases/latest, download `ymatrix1-vantage-<version>.tgz` and `SHA256SUMS` into a new empty directory, check the hash (`sha256sum -c --ignore-missing SHA256SUMS`, or `shasum -a 256`), then `npm install -g ./ymatrix1-vantage-<version>.tgz`. If `gh` is available, `gh attestation verify <file> --repo ymatrix1/vantage` also proves where it was built.
   3. **Checkout (fallback).** Look for an existing checkout: `~/.vantage/install.json` names one, or ask the user. If there is none, ask where to put it (suggest `~/vantage`; never inside the repo being tracked), then `git clone https://github.com/ymatrix1/vantage.git <dir>`, and in that directory `pnpm install --frozen-lockfile && pnpm build`. Check that `packages/cli/dist/src/main.js` exists. From here, `vantage` means `node <dir>/packages/cli/dist/src/main.js`.

   Run every command from the root of the repo the user wants to track. Run `vantage --version` once to confirm it works.
3. **Dry run first.** From that repo root run `vantage add --dry-run`. It prints every file it would change and writes nothing. Show the user the full output: the Claude Code settings file (8 hooks, and the status line unless another one is set), `config.toml` (the repo) and the hook command.
4. **Wait for the user's explicit OK.** Installing changes machine-level settings (the user's Claude Code `settings.json`). Don't continue without a clear yes in this chat.
5. **Install.** Run `vantage add --yes`. It backs up `settings.json` first, refuses unreadable settings, and never replaces another status line. Add `--git-hooks` only if the user asks for it.
6. **Start and verify.** Start the daemon in the background so this session is not blocked (`vantage start`; a second start is harmless because of the single-instance guard), then run `vantage doctor`. A FAIL must be fixed (show its fix line and ask before applying it). A WARN is fine if the user understands it, for example "no repos registered" before the first add.
7. **Offer the tour.** Ask: "Want a 3-minute walkthrough with made-up examples? Run `vantage tour`, or `vantage tour --demo` to click around a demo Track page." Run it only if the user says yes. The tour needs no network and never touches the real Vantage home.
8. **Report back** in a few lines: what was installed, where (file paths from the output), the backup path, how to open the Track page (`vantage open`), and how to undo it (`vantage remove` for this repo, `vantage uninstall` for the hooks and status line).

## Rules

- **Never** add tokens, API keys or credentials. Remote sources are connected later by the user.
- **Never** commit anything. Nothing in the tracked repo changes (the Vantage checkout lives outside it).
- **Never** run `vantage uninstall` or delete the Vantage home (`~/.vantage`) unless the user asks.
- **Never** edit `settings.json` or git config by hand for Vantage. Use `vantage add`, so the entries carry the `--vantage-managed` marker and can be removed exactly.
- If anything is unclear, ask the user instead of guessing.
