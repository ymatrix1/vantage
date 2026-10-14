# Testing

Applies once code exists. Framework: Vitest (*tentative*, see `docs/ARCHITECTURE.md`).

- **Scorers, detectors and the stage machine are pure functions over events.** Test them by replaying event fixtures and asserting stages, flags and scores.
- **Ingestion adapters** are tested against recorded source data (transcripts, git histories, API responses) that is synthetic or scrubbed (see `privacy-boundary.md`).
- **Every bug fix, issue or review finding** adds a test that fails without the fix. Verify the finding is correct before acting on it.
- **Hooks** have a test that they finish in under 100 ms and exit 0 when the daemon is down.
- **Linker and flag quality** are tracked with labeled sets (precision per flag), not only unit tests.
- Never weaken or delete an assertion to make a test pass without explaining why in the PR.
- Tests are hermetic: no network, no real home directory, no dependence on execution order.
