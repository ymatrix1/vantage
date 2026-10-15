// English tour text. Synthetic examples only.
import type { TourText } from "./types.ts";

export const en: TourText = {
  intro:
    "Vantage tour: 8 short steps, about 3 minutes. Nothing is read from your machine and nothing is sent.",
  stepLabel: (n, total) => `Step ${n} of ${total}`,
  pressEnter: "Press Enter to continue (Ctrl+C to stop)",
  steps: [
    {
      title: "What Vantage shows, and why",
      lines: [
        "Vantage shows how far each piece of your work has really got.",
        'Agents say "done" quickly. Vantage waits for evidence.',
        "One row per piece of work (a work item), not one per chat.",
        "",
        "Example row (made up):",
        "  add-retry      ●●◐○○○   Built · no proof yet",
        '                          the agent said "done"; no test ran after its last edit',
      ],
    },
    {
      title: "The six stages",
      lines: [
        "Every item moves along the same track, one step at a time:",
        "  Asked → Built → Proven → Reviewed → Shipped → Verified",
        "",
        'Worked example, "add-retry":',
        "  Asked    you asked for it              ●○○○○○",
        "  Built    3 files changed on a branch   ●●○○○○",
        "  Proven   a test passed after the edit  ●●●○○○",
        "Today Vantage knows the first three; the rest need later sources (pull requests, deploys).",
      ],
    },
    {
      title: "The dots",
      lines: [
        "Shape tells the state first, color backs it up (so it works for everyone):",
        "  ●  done (green)               ◉  in progress (blue)",
        "  ◐  built, no proof (amber)    ◍! needs you (red)",
        "  –  skipped or not set up      ○  not yet",
        'The Track page repeats this in its legend, "What the dots mean",',
        'and writes the stage in words beside the dots, such as "Built · no proof yet".',
      ],
    },
    {
      title: "Proof: what counts",
      lines: [
        "Proof is a check that really ran after your last edit and passed.",
        "  counts      pnpm test          (exit 0, tests ran, after the last edit)",
        "  not proof   pnpm test || true  (it cannot fail, so it proves nothing)",
        "  not proof   a test run before the last edit (the code changed since)",
        '  not proof   "all fixed!" in the chat (a claim, not evidence)',
        "Edit the code again and the proof expires: Proven drops back to Built.",
      ],
    },
    {
      title: "Flags and Needs you",
      lines: [
        "A flag is a warning on an item, with one suggested action.",
        "  unproven claim  said it was done, no check since the edit   → ask for proof",
        "  thrashing       3 edit-then-fail loops on the same file     → build a reproduction",
        "  forgotten       no activity for 5 days                      → resume, park or drop",
        '"Needs you" is the group of items that wait for something only you can do.',
        "Anything else is safe to ignore until the digest.",
      ],
    },
    {
      title: "How to read one item",
      lines: [
        "  fix-login-timeout     demo-api · fix/login-timeout     ●●◐○○○",
        "  ^ title (from the ticket, the branch or your first request)",
        "                        ^ repo and branch it is anchored to",
        "                                                         ^ the six dots",
        "Click a row on the Track page to see the evidence behind each dot:",
        "the edit it saw, the command that ran, its exit code, and why it sits where it does.",
        'A row called "Untitled session" is a session with edits and no ticket, branch or readable request.',
      ],
    },
    {
      title: "Daily commands",
      lines: [
        "  vantage start     run Vantage (leave it open in a terminal)",
        "  vantage open      open the Track page in your browser",
        "  vantage doctor    check that everything works, with a fix for each problem",
        "  vantage stats     numbers about your Track page, read-only",
        "  vantage add       start tracking this repo (dry run first, then your yes)",
        "  vantage remove    stop tracking this repo",
      ],
    },
    {
      title: "Your data, and how to undo",
      lines: [
        "Everything lives in one folder: ~/.vantage (or the folder VANTAGE_HOME names).",
        "Nothing leaves your machine by default. No outside model is called.",
        "Undo:",
        "  vantage remove     stop tracking this repo",
        "  vantage uninstall  remove the hooks and status line Vantage added",
        "  delete ~/.vantage  erase the data yourself",
      ],
    },
  ],
  outro: [
    "That is the tour. Next: `vantage add --dry-run` in a repo you work on.",
    "Want to click around first? `vantage tour --demo` opens made-up data and cleans up when you stop.",
    "More: docs/GUIDE.md and docs/GLOSSARY.md.",
  ],
  demo: {
    starting: "Building a temporary demo home with made-up items (your real Vantage home is not touched)...",
    open: "Open the demo Track page:",
    fake: "Everything in it is invented: repos named demo-*, no real data.",
    stop: "Press Ctrl+C to stop; the demo data is deleted on exit.",
    cleaned: "Demo stopped and its temporary files deleted.",
  },
};
