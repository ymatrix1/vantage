# Research: how Vibe Kanban drives Claude Code

> **Bean:** R12 (`vantage-lnws`), partial. **Checked:** 2026-10-14, against `BloopAI/vibe-kanban` `main` on GitHub.

## Question

How does Vibe Kanban run and control Claude Code, and what can Vantage learn from it?

## Answer

Vibe Kanban doesn't intercept a session the user started. **It launches Claude Code itself and drives it** through the same JSON control protocol the Claude Agent SDK uses.

| Aspect | What it does | Source |
|---|---|---|
| Launch | Spawns `npx -y @anthropic-ai/claude-code@2.1.119` (pinned version) as a child process; an alternative router build is also supported | `crates/executors/src/executors/claude.rs:63-65` |
| Mode | `-p` (print, headless) with `--output-format=stream-json --input-format=stream-json` | `claude.rs:159`, `claude.rs:190-191` |
| Multi-turn | Standard input stays open, so follow-up prompts and control answers go into the same process: a long-running headless session, not a one-shot call | `claude/protocol.rs` (stdin writer) |
| Permissions | `--permission-prompt-tool=stdio`: Claude sends each permission question as a `can_use_tool` control request; Vibe Kanban shows Approve in its UI and replies | `claude.rs:168`, `claude/protocol.rs:107-136` |
| Hooks | Registered at `initialize` as in-process callbacks with ids (`PreToolUse` approval or auto-approve, a `Stop` check reminding the agent to commit), not in `settings.json`; Claude calls back over the pipe | `claude.rs:209-258`, `claude/client.rs:323-375` |
| Chat view | Parses the JSON event stream and redraws it as its own conversation | executors crate |
| Billing | Uses the user's Claude login; counts as headless `-p` use against their plan | — |

## Implications for Vantage

| | Vibe Kanban (owns the session) | Vantage (observes sessions) |
|---|---|---|
| Who starts Claude | The app | The user, in a terminal or the desktop app |
| How events are seen | The JSON stream it owns | Settings hooks plus transcript files |
| Answer prompts from the UI | Yes | No; shows "waiting on you" |
| The user's interactive Claude Code | Replaced by its chat view | Unchanged |
| Headless `-p` usage | Always | Only when opted in (D46) |

- **Observing stays the default** (D1, D44, D46): the user keeps using Claude Code as before, and no headless usage is spent.
- **A possible later option:** a "run in Vantage" mode using the same stream-JSON protocol or the Agent SDK, for sessions the user chooses to start from Vantage. It would enable answering permission prompts and sending diff comments (D47) from the Vantage UI. It moves toward running agents, currently a non-goal, so it needs its own decision (open question Q24).
- **Hook callbacks over the control protocol** are an alternative to `settings.json` hooks, but only for sessions Vantage launches.

## Still open in R12

- How diff comments reach the agent in Vibe Kanban (D47 details).
- The MCP tools it exposes (D48 details).
- How its preview and click-to-component work (D49 details).
- Reusable code and licence notes (Apache-2.0).
