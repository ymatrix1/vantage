---
# vantage-mlko
title: Track page redesign pass and audit
status: completed
type: task
priority: normal
created_at: 2026-10-15T13:26:51Z
updated_at: 2026-10-15T13:26:55Z
---

## Context

Blocked by: none. The user reviewed the live Track page: not modern, buggy, no top view, header repeats itself, rows titled by branch, "needs you" on 10 of 12 rows. Earlier UI PRs landed piece by piece without checking the page against the plan.

## Higher Goal

Phase 1 exit: the morning catch-up happens on the Track page.

## Audit (live demo page vs docs/UX.md Track, specs/flags.md, ROADMAP Phase 1)

Checked: UX.md Track section, flags.md, ROADMAP Phase 1 UI lines, the demo page at 1280 and 700 px.

- [x] No top view (UX: focus on what matters). Added overview: needs you now, stages, in progress.
- [x] Header repeated itself (counts line, 5 chips, legend link, keys link). One summary line, one Help button, filters collapsed.
- [x] Layout: "All time479" no gap, Sort select arrow misaligned. Shared control classes, chevron select, equal heights, focus ring.
- [x] Group by offered attention, org, repo, stage, none only; no day. Added Day (client-side).
- [x] `unproven_claim` raised by test-only and throwaway edits (flags.md: amber waits for digest). D180.
- [x] Row said "needs you" for every non-forgotten flag. Label now says it only for stuck work. D180.
- [x] Status file counted a lone `forgotten` as needs you; the page does not. Aligned.
- [ ] Row titles are branch names when no better title exists: needs session names and first-prompt titles from the data layer (session `sessions-ux`). Not duplicated here.
- [ ] Detail heading "Why it needs you" is shown for unproven flags: Detail is owned by `sessions-ux`.
- [ ] Not built, by design for later phases: Moved since yesterday marker, board toggle, PR and ticket links, Focus, Item, Journal pages, "Waiting on others" group.
- [ ] Not compared (no budget): docs/PRD.md goals and specs/visual-language.md in full.

## Acceptance Criteria

- [x] Overview, one summary line, collapsed filter bar, Help button
- [x] Day, org, repo, stage, attention grouping
- [x] Test-only and throwaway edits raise no `unproven_claim`; tests added
- [x] Visual check at 1280 and 700 px, light and dark, on the synthetic demo (docs/screenshots/track-redesign)
- [x] UX.md, flags spec, DECISIONS D180 to D182, ROADMAP updated

## Out of Scope

Session names, multi-repo, Open in Claude, "What made it Asked" (sessions-ux). Daemon day grouping. Mobile-first redesign of Detail.

## Summary of Changes

Core: `isTestPath`, throwaway names in `isScratchPath`, test-only edits treated like docs. UI: `Overview.svelte`, rewritten `Toolbar.svelte`, Help button, day grouping (`apiQuery`), `stage-label` rule, shared control CSS. Daemon: status-file needsYou rule. Tests: stage, stage-label, overview.
