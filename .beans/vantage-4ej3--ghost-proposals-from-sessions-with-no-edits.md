---
# vantage-4ej3
title: Ghost proposals from sessions with no edits
status: draft
type: feature
created_at: 2026-10-14T20:10:27Z
updated_at: 2026-10-14T20:10:27Z
parent: vantage-nqh6
---

## Context

docs/specs/work-item-model.md: a session with user requests, no edits and no anchor yields a proposed Asked item that the user confirms or dismisses. Phase 1 has the linker (provisional items only for sessions with edits) and the stage machine. Blocked by: none. Interacts with: Item page (confirm and dismiss controls).

## Higher Goal

Ideas discussed with an agent that never became code do not disappear.

## Acceptance Criteria

- [ ] Detector in core: user request present, no file.edited, no anchor, enough activity to matter; pure, replayable, with tests for each case
- [ ] A proposed item with status proposed, shown on the Track page as a ghost; confirm turns it into a normal Asked item, dismiss hides it and never re-proposes
- [ ] Never invents titles: the title comes from the user's request text length-limited, or stays empty; no raw prompt stored beyond that
- [ ] Precision measured on synthetic fixtures and labeled sample counts only (privacy boundary)

## Out of Scope

Slack and Jira commitments; AI judgment of intent (rules only).

## Summary of Changes

TBD
