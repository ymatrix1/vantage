---
# vantage-jhn8
title: Themed select lists and no session ids as titles
status: completed
type: task
created_at: 2026-10-15T14:00:59Z
updated_at: 2026-10-15T14:00:59Z
---

## Context

Blocked by: none. Native selects open an OS list that ignores dark mode; untitled items showed a raw session id.

## Higher Goal

A page that looks and works as one product, in dark and light.

## Acceptance Criteria

- [x] Every select is the themed Select with keyboard, focus ring, pointer cursor
- [x] No raw session id in a title
- [x] Screenshots of the open list, dark and light

## Out of Scope

bits-ui or shadcn Select (see D184). Titles from prompt text.

## Summary of Changes

New Select.svelte, used by Toolbar, Pagination, Suggestions; fallbackTitle says Untitled session; D184; tests.
