# Spec: pings (who to reply to, nudge, or tell)

> **Status:** draft.

Work often stalls on people, not code. Vantage tracks three situations where you should ping someone, and helps you do it in one click. **Vantage never sends a message on its own:** it drafts, you send.

## The three cases

| Flag | Situation | Detected when | Clears when |
|---|---|---|---|
| `owe_reply` | Someone asked *you* something and is waiting | A message directed at you (mention, DM, review request, question in a thread you're in, assigned issue comment) is a question or request, and you haven't replied in that thread | You reply, react with an acknowledgment, or mark it done |
| `follow_up_due` | You're waiting on someone and it's gone quiet | You asked a question, requested a review, or are blocked by someone, and nothing came back within the threshold | They respond, the review lands, or you snooze it |
| `close_the_loop` | Someone should hear that their thing is done | An item reaches Shipped or Verified, and the person who asked for it, reported it, or was promised it hasn't been told since | You post an update in their thread or ticket, or mark it told |

`owe_reply` replaces the gap in `unseen_mention`: seeing a message isn't the same as answering it.

## Detection

- **Directed at you:** mentions, DMs, review requests, assignments, replies in threads you started. On GitHub the notification `reason` is only a hint: it is sticky per thread and can be overwritten, so a review request or mention is confirmed from the PR timeline and comments fetched after the thread bump ([GitHub research](../research/github.md#e3-reason-values-and-subject-shapes)).
- **Question or request:** rules first (question mark, request phrases like "can you", "could you", "please", "any update"), then an optional yes/no judge: "Does this message ask the recipient to reply or act?" Gated by the data policy setting.
- **Who to tell when done:** the issue reporter, the person whose message created a `commitment` item, review requesters, and anyone you promised in a thread linked to the item.
- **Thresholds** (configurable, working hours only):

| Case | Default |
|---|---|
| `owe_reply` from a person | amber after 4 working hours, red after 1 working day |
| `owe_reply` from a bot | ignored unless you opt in (bots wrote 93% of comments on the owner's PRs in 90 days, recognized by actor type) |
| `follow_up_due` | 2 working days; 1 for a review request blocking a merge |
| `close_the_loop` | as soon as the item ships; amber after 1 working day |

## Drafting the ping

One click drafts a short message in the right place, using the Explain engine (standup style):

| Case | Draft |
|---|---|
| `owe_reply` | An answer started from the item's status, or "Looking into this, back to you by Thursday" |
| `follow_up_due` | A friendly nudge with the one thing you need ("Could you take a look at PR #212? Only the retry logic changed.") |
| `close_the_loop` | "Shipped: dedupe is live and the duplicate rate is under 0.1% since Thursday", with evidence links |

The draft opens in the source app (Slack, GitHub, Jira, Linear) or is copied to the clipboard. **Sending is always your action.** Vantage records that a ping was drafted, and clears the flag only when it sees your message in the source.

## UX

- **Inbox** groups everything by person, in three sections: *You owe*, *Nudge*, *Tell them*. Each row has one action: Reply, Nudge or Tell.
- **Landscape:** waiting-on-others dots on the horizon get a small clock badge when a follow-up is due. Dots whose work shipped get a speech-bubble badge until the loop is closed.
- **Focus digest:** "3 people are waiting on you; 1 follow-up due; 2 people to tell."
- **Red only** for `owe_reply` past one working day from a person who is blocked by it.

## Privacy

- Message text is read only to classify questions and draft replies, and only when the data policy allows it.
- Drafts stay local until you send them yourself.
