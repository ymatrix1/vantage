---
name: research-task
description: Run a Vantage research bean (APIs, formats, measurements, tool comparisons) and record findings in docs/research/. Use for any bean tagged research.
---

# Research task

1. **Start:** `beans update <id> -s in-progress`. Re-read the bean's questions and acceptance criteria.
2. **Prefer primary sources:** official docs, API responses from the user's own account, local files and real measurements. Note the date and version of anything that can change (APIs, CLI formats).
3. **Verify, don't assume.** Run the command or query; record it with its output summary. If something can't be verified, say so.
4. **Respect the privacy boundary:** report shapes, counts and rates, never raw transcript, Slack, Jira or code content (see `.agents/rules/privacy-boundary.md`). Keep raw data and scratch scripts outside the repo.
5. **Write findings** to `docs/research/<slug>.md`:
   - Question, answer, evidence (commands, links, dates), implications for the design, open follow-ups.
6. **Feed the design:** update the affected specs, `docs/DECISIONS.md` (as proposals) and `docs/OPEN-QUESTIONS.md` using the `update-spec` skill.
7. **Close:** tick acceptance criteria, add `## Summary of Changes`, `beans update <id> -s completed`, `beans archive`, commit and push.
