---
# vantage-uegr
title: Re-run the Windows Defender check on the native hook with Defender active
status: todo
type: task
created_at: 2026-10-14T19:26:53Z
updated_at: 2026-10-14T19:26:53Z
parent: vantage-fmfh
blocked_by:
    - vantage-bfr1
---

## Context

Split from vantage-bfr1. On the dev laptop Defender is passive (other AV products registered, AMServiceEnabled False), so the scan could not run. Blocked by: vantage-bfr1. Check the packed tarball after npm install on a machine with Defender as the active AV; record the result; decide on signing only if it is flagged.

## Higher Goal

Never slow an agent down.

## Acceptance Criteria

- [ ] Defender custom scan and real-time check of the installed binary recorded
- [ ] Signing decision recorded only if flagged

## Out of Scope

Signing itself unless flagged.
