# Privacy boundary

Vantage reads sensitive data: agent transcripts, source code, Slack, Jira, Linear, GitHub and monitoring. None of it may leave the user's machine through this repo.

Never commit, paste into issues or PRs, or use as test fixtures:

- Real Claude Code or Codex transcripts, or excerpts of them.
- Slack messages, Jira or Linear issue content, GitHub comments from private repos, monitoring alerts.
- Tokens, API keys, cookies, account ids, user ids, emails, internal hostnames or URLs.
- Names of real people other than the repo owner, or company-internal project names, unless already public.
- Files from `~/.vantage/`, `~/.claude/`, `~/.codex/` or any database file.

Fixtures must be **synthetic**, or **scrubbed** by a script that replaces ids, names, URLs and message text. Note in the fixture's header comment which it is.

Research findings in `docs/research/` report aggregates and patterns (counts, rates, shapes of data), never raw content.

Any feature that sends data to an outside service (LLM, judgment model, webhook relay) needs an explicit setting, defaults to off, and sends the minimum context.
