# Changelog

Generated from Conventional Commits by `tools/release.mjs`. See [RELEASING.md](RELEASING.md).

## 0.3.0 (2026-10-15)

### Features

- **ui:** themed select lists; untitled items never show a session id (796c2c2)
- **ui:** full-colour dots by default, colour-blind friendly setting, aligned row columns (b321b25)
- **track:** session names, a meaningful Asked line and Open in Claude (D191 to D193) (76bb10f)
- **ui:** Track redesign: overview, collapsed filters, day grouping, fewer false needs-you (e80a023)
- **track:** items list every repo they touched (D190) (7d65fb0)

### Bug fixes

- **titles:** id suffix for colliding untitled items that are not sessions (41bd5d3)
- **titles:** tell untitled items apart only when they collide (D195) (0a408ea)
- **titles:** find names and requests deeper in the transcript, never read the same (D195) (32d79f5)
- **titles:** injected messages are never a request or title (D194) (2911319)
- **core:** strip control characters from session names without spreading (18ef9fd)
- **ui:** show the pointer cursor on buttons and links (1ed4a56)

### Performance

- **titles:** spread one-time deep transcript reads over passes (D195) (3f00f8f)

## 0.2.0 (2026-10-15)

### Features

- **track:** organization filter, Asked evidence and one-line proofs (6daa85b)
- **cli:** demo repos with a made-up remote; tour tests read the stored payloads (3e51c8d)
- **cli:** vantage tour, a guided offline walkthrough and a synthetic demo home (54ea001)
- **daemon:** organisation level above repo (org, host, repoName) (e2b9fe6)
- **classify:** opt-in Haiku classifier with bulk accept and batch undo (72b4d6b)
- **ui:** Track v2, projects, readable rows, inline detail and links (7351ffc)

### Bug fixes

- **docs:** one Terms line on the web UI spec (02b7625)
- **docs:** resolve the DECISIONS merge conflict left in the last merge (33f29cd)
- **daemon:** resolve the repo-relative path when the event spells the folder differently (2c17e15)
- **core:** edits to scratch and git-ignored files are not code edits (53cac19)
- **classify:** run in <home>/work and drop everything inside it at ingest (D101) (b676099)
- **daemon:** an item's repo is its git repo, not the worktree folder (39b8912)

## 0.1.0 (2026-10-15)

### Features

- **release:** scoped @ymatrix1 names, staged trusted publishing, no npm token (63c2e9d)
- **ingest:** task lists, sub-agent runs, fork and resume counts (624a191)
- **track:** forgotten is its own group, backfilled conversations are never forgotten, session counts (d970a53)
- **release:** release PR, one npm package, gated publish workflow and vantage --version (12fe781)
- **cli:** replace tautological proof share, split Needs you by kind, count checks by family (8a2972c)
- **daemon:** title provisional items from the first request, local only, with a switch (a776182)
- **daemon:** one file per SQLite migration, with checksums and a CI freeze (374a524)
- **ui:** use the merged Track API types; build quiet groups on the page (f2e66c4)
- **linker:** anchor sessions on the transcript branch, with docs and measurements (3ab32ac)
- **ingest:** carry the transcript branch on tool events (3d5d5ff)
- **cli:** add session lineage numbers to vantage stats (41b1070)
- **ui:** dot legend, stage label and a dash for skipped dots (2d39ed0)
- **daemon:** track query API with filters, paging, facets and recent-only flags (4a26d19)
- **ui:** Track page search, filters, sort, group-by and pagination (0729a36)
- **linker:** group derived sessions under their parent's item (ebdd73f)
- **cli:** add vantage stats for Track page usefulness (5b99278)
- **plugin:** vantage plugin with /vantage:open, start, doctor, status, add (52505a2)
- **daemon,ui:** live Track updates over a WebSocket (vantage-tizy, D81 proposed) (c8a0c6a)
- **cli:** installer registers the native hook and doctor reports it (addb382)
- **hooks:** ship the Rust spool hook crate, parity test and dry-run release workflow (47ebb1e)
- **cli:** vantage add, remove, uninstall and doctor (b3af740)
- **cli:** vantage start and open, one-process daemon runtime (ad0acb6)
- **ui:** Track page on a secured local server (5a1b130)
- **status-line:** text glyph status line from a daemon-written summary (be573c3)
- **hooks:** Stop hook emits session.stopped and runs the proof gate in warn mode (eda3b57)
- **core:** stage machine for Asked, Built and Proven with proof expiry (91e62e4)
- **linker:** link events by issue key, branch and worktree anchors (7bc1686)
- **daemon:** git scan loop with per-worktree cadence and persisted cursors (7a792bb)
- **git:** scanner for registered repos and worktrees (77e6b0d)
- **ingest:** hook collector, spool ingest and transcript backfill (7454b0d)
- **scaffold:** pnpm workspace, strict TS, Oxc tools, Vitest, code CI (bb9397e)
- **plugin:** add close-the-loop and plan-task skills (180fe5a)
- **plugin:** add handoff, land-the-day and answer-review skills (03a2460)
- **plugin:** add prove-it and record-decision skills (e58db72)
- **plugin:** add A2V plugin with top-down communication (84a9868)
- **brand:** capitalize the wordmark and center its cap height (ff4055d)
- **brand:** add logo and Bree Serif wordmark (3d1f523)

### Bug fixes

- **core:** split shell commands without cutting quotes; a grep is not a test run (695cc56)
- **release:** pass tarballs to npm publish as ./ paths (c248529)
- **cli:** treat every provisional session item as a fallback title (ec8ce7a)
- **cli:** use toSorted in stats lineage median (3dced8a)
- **cli:** read derived sessions from the item_sessions view (6d97f35)
- **hooks:** native hook skips flag arguments when finding the Node entry (36964d0)
- **ingest:** resolve repo root from worktrees and capture test run counts (41c2c2d)
- **ci:** raise vitest timeouts to 20 s for slow Windows runners (78f3833)
- **ingest:** count shell writes as edits only inside the repo (cd922a1)
- **core:** drop quoted and heredoc false positives in shell detection (4eca790)
- **ui:** type App.svelte as TS so svelte-check resolves .svelte imports (beb7c87)
- **test:** resolve temp root with realpath.native for Windows CI (5d92338)
- **test:** keep synthetic emails out of literals for the docs privacy scan (ce171c0)
- **plugin:** apply A2V plugin test findings (16de747)

### Performance

- **hooks:** run built JS for the spool hook, cutting cold start ~30 ms (4b1d3d1)
