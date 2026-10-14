# Landscape (October 2026)

Based on web research and comparison posts, several written by competing vendors. None of these tools were installed or tested.

## Session managers and boards

| Tool | What it does | Gap for Vantage |
|---|---|---|
| Claude Code Agent View (native, research preview since May 2026) | One list of sessions, which ones wait on you, reply inline | Sessions, not work; no evidence-based status |
| Pane | Open-source desktop app, real agent terminals side by side, status dots, Windows support | Sessions only |
| CodeAgentSwarm | Desktop app with notifications, searchable history, kanban updated by agents over MCP | Board is agent-reported, not evidence-based |
| Vibe Kanban | Kanban that dispatches agents to worktrees (unmaintained since April 2026) | Dispatch tool; status from agents |
| Conductor | Mac app, parallel agents in worktrees, diff review | Mac only; sessions |
| Claude Squad | tmux TUI, worktree per agent | No Windows; sessions |
| Kanban Code, Claudine, Nimbalyst | Session boards and workspaces | Sessions |

## Transcript tools

| Tool | What it does |
|---|---|
| `claude-code-log` (Python) | Converts transcripts to HTML/Markdown, date filters ("what did I work on yesterday") |
| `claude-code-viewer` (TypeScript) | Web UI for transcripts with git diff panel, can continue sessions |

Possible reuse: transcript parsing.

## Proof and verification

Only do-it-yourself pieces exist: Stop-hook "done" gates shared on Reddit and blogs, pi-warden (Jev-based guardrail for the Pi agent that also flags "done" claims with no test run), spec-verify (a Claude Code skill checking that Given/When/Then tests actually test something). No product combines proof with work tracking.

## Judgment models

Jev from TypeSafe AI (launched September 2026): returns typed decisions with calibrated probabilities, roughly 70–500 ms, $0.042 per million input tokens, no text generation. Available through OpenRouter and Vercel AI Gateway. Fits fuzzy yes/no checks; can still pick a wrong valid answer.

## Ideas worth borrowing from Vibe Kanban

Vibe Kanban is Apache-2.0, so ideas and, where useful, code can be reused with attribution. It's a dispatcher (it runs agents), which Vantage isn't, so only some ideas fit.

| Idea | Fit for Vantage |
|---|---|
| Inline comments on a diff, sent to the agent | **Yes** (accepted as D47) |
| MCP server so agents create and update cards | **Partly:** agents may add intent and proof references, never move stages (accepted as D48) |
| Built-in preview browser with devtools and click-to-component | **Partly:** as screenshots for `visual` proof (accepted as D49), not a browser in Vantage |
| Worktree per task with setup and cleanup scripts | **No:** orchestration is out of scope; Vantage reads worktrees others create |
| PR creation from the card | **Later, maybe:** a hand-off action, if it stays explicit |
| Kanban board | **Toggle only:** Track rows are the default (D15) |

Details to verify in research bean R12.

## Conclusion

Session visibility is solved. Evidence-based work state, proof, ghosts, review loop, post-ship verification and a calm personal focus view are not.
