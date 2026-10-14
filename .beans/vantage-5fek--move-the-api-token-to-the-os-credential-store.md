---
# vantage-5fek
title: Move the API token to the OS credential store
status: todo
type: task
created_at: 2026-10-14T19:52:18Z
updated_at: 2026-10-14T19:52:18Z
parent: vantage-fmfh
---

## Context

D75 keeps the API token in a user-only file for Phase 1 (`vantage-6bni` split this out instead of adding platform code). Architecture says the OS credential store (Windows Credential Manager, macOS Keychain). Blocked by: the installer (`vantage-p9x2`) decides how native access is packaged.

## Higher Goal

Secrets never sit in plain files (operations spec, Secrets).

## Acceptance Criteria

- [ ] Token read and written through the OS credential store, with the file as fallback where none exists
- [ ] Existing token file migrated and removed, with a test
- [ ] D75 revisited or superseded

## Out of Scope

Third-party source tokens (GitHub, Slack) until those sources exist.
