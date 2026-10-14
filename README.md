# Vantage

A personal, calm view of the true state of your work across AI coding agents, git, pull requests, CI/CD, monitoring, Jira or Linear, and Slack.

Vantage tracks **work items**, not sessions. Each item moves along one evidence-based track:

```
Asked → Built → Proven → Reviewed → Shipped → Verified
```

A card moves only on evidence: a git diff, a test or data check that ran after the last edit, a PR approval, a deploy, a clean monitoring window. What an agent *says* never moves a card.

> **Status:** planning. No code yet. These docs are the source of truth.

## Documents

| Doc | What it covers |
|---|---|
| [PRD](docs/PRD.md) | Problem, pains, user, goals, non-goals, success metrics |
| [UX](docs/UX.md) | Surfaces (Focus, Board, Item, Ambient) and UX rules |
| [Architecture](docs/ARCHITECTURE.md) | Sources, event store, linker, scorers, surfaces, privacy |
| [Spec: lifecycle](docs/specs/lifecycle.md) | Stage gates, backward moves, flags, proof rules |
| [Spec: work item model](docs/specs/work-item-model.md) | Entities, anchors, linking rules |
| [Spec: scoring](docs/specs/scoring.md) | Priority, difficulty, spread, staleness |
| [Spec: ingestion](docs/specs/ingestion.md) | How each source is listened to: push, polling, cursors, relay |
| [Spec: operations](docs/specs/operations.md) | Identity, config, secrets, seen state, daemon, health, quality |
| [Roadmap](docs/ROADMAP.md) | Build phases and exit criteria |
| [Decisions](docs/DECISIONS.md) | Decision log |
| [Open questions](docs/OPEN-QUESTIONS.md) | What still needs deciding |
| [Landscape](docs/research/landscape.md) | Existing tools and why they don't cover this |

Agent instructions: [AGENTS.md](AGENTS.md) (canonical), rules in `.agents/rules/`, skills in `.agents/skills/`. Tasks are tracked with [beans](https://github.com/hmans/beans) in `.beans/`.
