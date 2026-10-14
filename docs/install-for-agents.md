# Installing Vantage (instructions for AI agents)

> **Status:** works for Claude Code from a built checkout (`pnpm install && pnpm build`). Not yet run end to end on a fresh machine, and not yet published to npm (so `npx vantage` is not available). Codex steps are not written because Vantage does not install Codex hooks yet. The commands below are `vantage ...`; until the npm package exists, run them as `node <checkout>/packages/cli/dist/src/main.js ...`.

This file is written for an AI coding agent (Claude Code or similar) that a user asked to install Vantage. Follow the steps in order and stop at any step that fails.

## The prompt users paste

```text
Install Vantage in this repo. Follow https://github.com/ymatrix1/vantage/blob/main/docs/install-for-agents.md exactly: show me the dry run first, wait for my OK, then install, verify with vantage doctor, and tell me what changed.
```

## Steps for the agent

1. **Check prerequisites.** Node.js 22.5 or newer (`node --version`; Vantage uses the built-in `node:sqlite`) and git. In a checkout, `pnpm install && pnpm build` must have run. If something is missing, tell the user what to install and stop.
2. **Dry run first.** From the repo root run `vantage add --dry-run`. It prints every file it would change and writes nothing. Show the user the full output: the Claude Code settings file (8 hooks and the status line), `config.toml` (the repo) and the hook command.
3. **Wait for the user's explicit OK.** Installing changes machine-level settings (the user's Claude Code `settings.json`). Don't continue without a clear yes in this chat.
4. **Install.** Run `vantage add --yes`. It backs up `settings.json` first, refuses unreadable settings, and never replaces another status line. Add `--git-hooks` only if the user asks for it.
5. **Start and verify.** Run `vantage start` in a separate terminal (it stays running), then `vantage doctor`. A FAIL must be fixed (show its fix line and ask before applying it). A WARN is fine if the user understands it, for example "no repos registered" before the first add.
6. **Report back** in a few lines: what was installed, where (file paths from the output), the backup path, how to open the Track page (`vantage open`), and how to undo it (`vantage remove` for this repo, `vantage uninstall` for the hooks and status line).

## Rules

- **Never** add tokens, API keys or credentials. Remote sources are connected later by the user.
- **Never** commit anything. Nothing in the repo changes.
- **Never** run `vantage uninstall` or delete the Vantage home (`~/.vantage`) unless the user asks.
- **Never** edit `settings.json` or git config by hand for Vantage. Use `vantage add`, so the entries carry the `--vantage-managed` marker and can be removed exactly.
- If anything is unclear, ask the user instead of guessing.
