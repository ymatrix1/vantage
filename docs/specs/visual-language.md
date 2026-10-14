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

## Proof level ring

Proof strength is shown by **counting green arcs** around a solid green core. Counting 1 to 4 works at a glance, even at 15 px and in grayscale. An earlier "shine" design (highlights and thin rings) was dropped because the levels blurred together at real sizes.

| Level | Look |
|---|---|
| L1 ran | Solid core, 1 arc |
| L2 linked | Solid core, 2 arcs |
| L3 behavior | Solid core, 3 arcs |
| L4 production | Solid core, full ring of 4 arcs |

Rules:

- Arcs are green only, with no background track ring behind them.
- **Only the Proven dot carries arcs.** Asked, Built, Reviewed and Shipped stay plain filled dots when done; Verified implies L4.
- The solid core keeps it distinct from the half-filled amber "no proof" dot, which has no core.

## Flag icons

One line-icon set (no emoji, which renders differently per machine), each icon on a tinted circle in the flag's severity color. The icon for every flag is listed in the [flag registry](flags.md).

## Dot characters

Every work item is drawn as a **dot character**. Each visual channel carries exactly one meaning:

| Channel | Meaning |
|---|---|
| Body color | Project (identity, not status) |
| Ring of six arcs around the body, with a clear gap | The A2V track: green arcs done, one colored arc for the current step (red needs you, amber unproven, blue in progress), white arcs for steps still to go |
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

- **Neutral ground.** Scene backgrounds (ground, horizon) never use meaning colors. Green appears only on dots, so it always means done. A first render with green grass hid the done arcs.
- **Ring spacing.** The ring sits clearly apart from the body (gap of at least 7 px, or about 40% of the body radius on large dots); without the gap the ring and body merge.
- **Badges sit just outside the ring**, top right, so they never cover an arc.
- **Overflow** shows as "+N need you" in the foreground and "+N more" in the middle ground.
- **Corners:** forgotten items bottom left (moon icon and count), parked items bottom right (shelf and count).
- **Validated at 25 items** (Q20): caps, overflow and placement hold without collisions; see [the stress-test render](../mockups/landscape-25.png). Middle-band rings show progress at a glance but aren't meant to be counted; counting happens on foreground dots and the Item card.
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
- **Mood check:** the landing ends with one tap: "How heavy does work feel? 1–5." Optional, local only, used for the PRD's felt-load metric.
- **Morning:** the landscape wakes with "since yesterday" changes marked.

## Gamification rules

Reward good practice, never volume or speed:

- **Rewards:** proof arcs (more arcs for stronger proof), stars for verified work, gentle streaks (for example "clean landings this week"), rare badges for A2V practices (first L3 proof, a week without `claimed_fixed`, every mention answered, parking honestly).
- **Streaks pause, never break.** Missing a day pauses; nothing resets with a red mark.
- **Avoided on purpose:** leaderboards, points for commits or lines, breaking streaks, random rewards, urgency colors on things that aren't red.

## Companion (optional)

A small dot character can summarize the overall state with its face (calm, focused, needs you, resting) and at most one line of text. It never chats on its own. Off in quiet mode. Whether it's needed now that every item is a character is open question Q22.

## Scene palettes

Scenes need their own palettes; meaning colors (dots, arcs, badges) stay the same in all of them.

| Scene | Sky | Horizon | Middle | Foreground | Notes |
|---|---|---|---|---|---|
| Day (light mode) | `#3C3489` | `#F1EFE8` | `#E9E5DA` | `#DDD7C8` | Validated in the 25-item test |
| Dusk | `#26215C` | `#E8E2D3` | `#DCD4C2` | `#CFC5AF` | Evening landing starts here |
| Night and dark mode | `#15132E` | `#24262B` | `#1E2024` | `#18191C` | Dot bodies keep their tint; labels switch to light text |

These are first proposals; research bean R14 (`vantage-700a`) validates contrast for every meaning color on every scene.

## Quiet mode and accessibility

- **Quiet mode** turns off faces, motion and the companion; dots and the landscape stay.
- Motion respects `prefers-reduced-motion`.
- Status is never color-only (shape and icon always present).
- Custom themes may restyle scenes but must keep the meaning colors distinguishable (D27).
