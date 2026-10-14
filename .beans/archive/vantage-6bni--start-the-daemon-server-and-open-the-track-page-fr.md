---
# vantage-6bni
title: Start the daemon server and open the Track page from the CLI
status: completed
type: task
priority: normal
created_at: 2026-10-14T19:11:01Z
updated_at: 2026-10-14T19:52:37Z
parent: vantage-fmfh
blocked_by:
    - vantage-olgf
---

## Context

`vantage-olgf` ships `startHttp`, `loadOrCreateToken` and the built UI (`packages/ui/dist`), but nothing starts them. A `vantage start` and `vantage open` path must serve the UI on 127.0.0.1, run the stage loop in the same process and open `http://127.0.0.1:<port>/#token=...`. Blocked by: none (olgf lands first).

## Higher Goal

Phase 1 exit: the page is reachable every morning without a dev setup.

## Acceptance Criteria

- [x] `vantage start` runs ingest, the stage loop and the HTTP server in one daemon
- [x] `vantage open` opens the browser at the fragment URL; the token is never in a query string
- [x] Workspace package `exports` `default` point at the real build output (`tsc` emits `dist/src/index.js`, the manifests said `dist/index.js`; already fixed on main, verified here, and `pnpm build` now produces what the CLI runs)

## Out of Scope

The installer (`vantage-p9x2`). Split out because D75 keeps the token file for Phase 1: moving the token to the OS credential store (`vantage-5fek`).

## Summary of Changes

- `@vantage/daemon` `runtime.ts`: `startDaemon` (one process: spool ingest and backfill, git loop, stage loop with `status.json`, secured HTTP server), `daemon.lock` single-instance guard, `health.json`, `readRepos`, clean shutdown.
- `@vantage/cli`: `vantage start [--port]` and `vantage open [--print]`; `pnpm build` now builds every package and the UI.
- Tests: `packages/cli/test/daemon.test.ts` (spool in, `status.json` out, status line prints the item, `/api/track` with the token; second start refused; stale lock taken over; clean stop; `open` fragment URL; missing config means no repos).
- D78 proposed; operations spec and ROADMAP updated.
