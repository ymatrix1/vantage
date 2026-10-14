# Spec: flag registry

The single source of truth for flags. Other specs link here instead of repeating the list. A new flag needs a row here first, with every column filled.

Flags sit on any work item, whatever its stage. Each flag has exactly one primary action. In the A2V method they're called *signals*.

| Flag | Trigger | Severity | Icon | One action | Spec |
|---|---|---|---|---|---|
| `waiting_on_you` | A session waits on a permission prompt or question (`Notification` hook) | red | Raised hand | Open the session | [ingestion](ingestion.md) |
| `ai_decided` | A business rule in the diff isn't in the request or approved behaviors | red | Scale | Approve or change the decision | [behaviors and detectors](behaviors-and-detectors.md), [decision log](decision-log.md) |
| `collision` | Two active sessions edit the same uncommitted file | red | Two overlapping circles | Open both sessions | [lifecycle](lifecycle.md) |
| `regression` | A linked alert, error spike, failed prod check, incident or revert after ship | red | Falling star | Open the follow-up item | [lifecycle](lifecycle.md#backward-moves-and-follow-ups) |
| `unproven_claim` | The session claimed completion with edits and no qualifying proof after the last edit | amber | Flask | Ask for proof | [proof](proof.md) |
| `thrashing` | 3 or more consecutive edit → failing command cycles on the same files | amber | Circular arrows | Resume with a "build a reproduction first" prompt | [behaviors and detectors](behaviors-and-detectors.md) |
| `forgotten` | Asked or Built with no activity for N days (default 5), or a commitment with no follow-up | amber | Moon | Resume, park or drop | [scoring](scoring.md#staleness-and-forgotten) |
| `unseen_mention` | A Slack, Jira or Linear mention, or GitHub review request, with no reply or reaction | amber; red if the person is blocked | At sign | Open the message | [pings](pings.md) |
| `claimed_fixed` | A reply says fixed or done on a review thread, but no later commit touches the commented lines | amber | Speech bubble with an exclamation mark | Open the thread and the diff | [lifecycle](lifecycle.md#reviewed-sub-states) |
| `owe_reply` | Someone asked you a question or request and you haven't replied, even if you saw it | amber; red after 1 working day if they're blocked | Speech bubble with a question mark | Draft a reply | [pings](pings.md) |
| `follow_up_due` | You're waiting on someone and nothing came back within the threshold | amber | Clock | Draft a nudge | [pings](pings.md) |
| `close_the_loop` | The item shipped or was verified and the person who asked for it hasn't been told | amber | Speech bubble with a check | Draft an update | [pings](pings.md) |
| `shipped_unverified` | Deployed, but no post-deploy check ran within N hours (default 24) | amber | Rocket with a dashed trail | Run or open the post-deploy check | [lifecycle](lifecycle.md#verified-in-detail) |

## Rules

- **Severity:** red interrupts (toast, foreground); amber waits for the digest.
- **Icons** come from one line-icon set, on a tinted circle in the severity color. Never emoji.
- **Precision:** each flag's dismissal rate is tracked; a flag dismissed as wrong more than 30% of the time gets fixed or turned off (see [operations](operations.md#quality-how-we-know-it-works)).
- **Quiet mode** keeps red flags and hides amber ones until the digest.
