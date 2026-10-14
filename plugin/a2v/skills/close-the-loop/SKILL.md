---
name: close-the-loop
description: Find the people waiting on you or on your work, and draft the message for each - a reply you owe, a nudge when you're waiting on someone, or a "shipped" note to whoever asked for the work. Never sends; the user sends. Use when the user asks "who's waiting on me?", "who do I owe a reply?", "draft a follow-up", "tell them it shipped", or after work is merged or deployed.
---

# Close the loop

Work often stalls on people, not code. Three kinds of loop stay open:

| Loop | Situation | Draft |
|---|---|---|
| **You owe a reply** | Someone asked you a question or request and you haven't answered, even if you saw it | An answer, or "looking into it, back to you by <day>" |
| **Nudge** | You asked someone and it went quiet (about 2 working days) | A friendly, specific reminder with the one thing you need |
| **Tell them** | Work someone asked for has shipped, and they haven't been told | What shipped, how it was verified, where to see it |

## Steps

1. **Find the loops** with the tools available; ask the user for what you can't see:
   - GitHub (`gh`): review requests and questions on your PRs you haven't answered; reviews you requested with no response; merged PRs whose issue reporter or requester wasn't told.
   - This session and today's handoff notes: questions and promises ("I'll check", "will fix").
   - Slack, Jira or Linear only if the user has a connector and allows it.
2. **Show them in one table**, grouped by person:

   | Person | Loop | About | Waiting since |
   |---|---|---|---|
   | reviewer A | You owe a reply | "Why 3 retries?" on PR #212 | 1 day |
   | reviewer B | Nudge | Your review request on PR #215 | 3 days |
   | reporter C | Tell them | Dedupe fix is live | today |

3. **Draft one message per loop**, short and specific:
   - Lead with the point; one or two sentences.
   - Use facts and evidence from the work (commit, check, link), not claims.
   - Match the place: a PR reply, a ticket comment, a chat message.
4. **Show the drafts and let the user send them.** Never post or send a message yourself. If the user asks you to post on GitHub, post only the drafts they approved, exactly as approved.

## Draft examples

> **Reply owed:** "3 retries because the provider rate-limits at 5 per minute; more retries would hit that limit. Tested in `retry.test.ts`."

> **Nudge:** "Hi! Could you take a look at PR #215 when you get a chance? Only the retry logic changed, about 40 lines."

> **Tell them:** "Shipped: duplicate events are now dropped at ingest. Verified on production since Thursday, duplicates are under 0.1%."

## Never

- Send, post or react on the user's behalf without explicit approval of that exact message.
- Invent a reason, date or result. If you don't know, leave a blank for the user: "back to you by ___".
