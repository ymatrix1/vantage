# Spec: visual language

> **Status:** draft. Mockups: [docs/mockups/visual.html](../mockups/visual.html).

Vantage is **visual first**: shape, color, size and position carry state; a few words carry identity; everything else is one click away. This spec defines the vocabulary every page uses.

## Word budget

- A screen shows about **30 words** by default.
- Each item keeps a **2–4 word title** and a project color. Nothing else is required to identify it.
- Reasons, history and actions appear on hover or click.
- Every hidden text still exists for screen readers.

## The dot alphabet

The dot is the atom of the UI. Meaning is carried by **shape first**, then color, so it works for colorblind users and in any theme.

| State | Shape | Color |
|---|---|---|
| Done | Filled | Green |
| In progress | Thick ring | Blue |
| No proof | Half filled | Amber |
| Needs you | Ring with a small badge dot | Red |
| Skipped or not set up | Dashed ring | Gray |
| Not yet | Thin ring | Light gray |

## Proof shine

A stronger proof makes a done dot shinier, so the A2V method itself becomes the reward.

| Level | Look |
|---|---|
| L1 ran | Matte |
| L2 linked | Highlight |
| L3 behavior | Highlight and an outer ring |
| L4 production | Highlight, ring and small rays |

## Flag icons

One line-icon set (no emoji, which renders differently per machine), each on a tinted circle:

| Flag | Icon |
|---|---|
| `waiting_on_you` | Raised hand |
| `unproven_claim` | Flask |
| `ai_decided` | Scale |
| `thrashing` | Circular arrows |
| `forgotten` | Moon |
| `unseen_mention` | At sign |
| `regression` | Falling star |

## Dot characters

Every work item is drawn as a **dot character**. Each visual channel carries exactly one meaning:

| Channel | Meaning |
|---|---|
| Body color | Project (identity, not status) |
| Ring of six arcs around the body | The A2V track: green arcs done, one colored arc for the current step (red needs you, amber unproven, blue in progress) |
| Face | Attention: awake and blinking = needs you; small eyes = working; closed eyes = forgotten |
| Badge icon | The reason, as one flag icon |
| Size | Priority within its band |
| Position | See the landscape below |

## The landscape (home)

The home screen is the view from your vantage point:

| Band | Contents | Cap |
|---|---|---|
| **Foreground** | Needs you (today's top 3), large, labeled | 3 |
| **Middle ground** | Moving, medium, labeled | about 8, then "+N" |
| **Horizon** | Waiting on others, small, unlabeled | count only |
| **Sky** | Verified this week, as stars | all |
| **Shelf** (corner) | Parked items | count |

Rules:

- **Stable placement:** within a band, order is by priority and doesn't shuffle between visits.
- **The Track page is the fallback** for finding a specific item or seeing many at once. Both views show the same data.
- **The sky follows the time of day** (day, dusk, night palettes). Each scene has a quieter variant for the calm theme.

## Interactions

| Action | Meaning |
|---|---|
| Drag a dot to the foreground | Pin it as one of today's three |
| Drag a dot to the shelf | Park it |
| Click a dot | It expands in place into its Item card |
| `e` on a dot, project or week | Explain (see [explain spec](explain.md)) |

Dragging never changes a stage; only evidence does (D3).

## Moments

- **Verified:** the dot rises and becomes a star. Click a star to see that item's history.
- **Regression:** a small follow-up dot falls from the star. Visible, gentle.
- **Evening landing:** at the end of your working hours the landscape dims. Each foreground dot asks *tomorrow, park, or done?* Then the dots sleep. This closes open loops so you can stop thinking about work.
- **Morning:** the landscape wakes with "since yesterday" changes marked.

## Gamification rules

Reward good practice, never volume or speed:

- **Rewards:** proof shine, stars for verified work, gentle streaks (for example "clean landings this week"), rare badges for A2V practices (first L3 proof, a week without `claimed_fixed`, every mention answered, parking honestly).
- **Streaks pause, never break.** Missing a day pauses; nothing resets with a red mark.
- **Avoided on purpose:** leaderboards, points for commits or lines, breaking streaks, random rewards, urgency colors on things that aren't red.

## Companion (optional)

A small dot character can summarize the overall state with its face (calm, focused, needs you, resting) and at most one line of text. It never chats on its own. Off in quiet mode. Whether it's needed now that every item is a character is open question Q22.

## Quiet mode and accessibility

- **Quiet mode** turns off faces, motion and the companion; dots and the landscape stay.
- Motion respects `prefers-reduced-motion`.
- Status is never color-only (shape and icon always present).
- Custom themes may restyle scenes but must keep the meaning colors distinguishable (D27).
