---
# vantage-6bni
title: Start the daemon server and open the Track page from the CLI
status: todo
type: task
created_at: 2026-10-14T19:11:01Z
updated_at: 2026-10-14T19:11:01Z
parent: vantage-fmfh
blocked_by:
    - vantage-olgf
---

## Context

`vantage-olgf` ships `startHttp`, `loadOrCreateToken` and the built UI (`packages/ui/dist`), but nothing starts them. A `vantage start` and `vantage open` path must serve the UI on 127.0.0.1, run the stage loop in the same process and open `http://127.0.0.1:<port>/#token=...`. Blocked by: none (olgf lands first).

## Higher Goal

Phase 1 exit: the page is reachable every morning without a dev setup.

## Acceptance Criteria

- [ ] `vantage start` runs ingest, the stage loop and the HTTP server in one daemon
- [ ] `vantage open` opens the browser at the fragment URL; the token is never in a query string
- [ ] The token moves to the OS credential store, or D75 is revisited
- [ ] Workspace package `exports` `default` point at the real build output (`tsc` emits `dist/src/index.js`, the manifests say `dist/index.js`)

## Out of Scope

The installer.
