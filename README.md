<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-wordmark-dark.svg">
    <img src="assets/logo-wordmark.svg" alt="Vantage" height="72">
  </picture>
</p>

# Vantage

A personal, calm view of the true state of your work across AI coding agents, git, pull requests, CI/CD, monitoring, Jira or Linear, and Slack.

Vantage tracks **work items**, not sessions. Each item moves along one evidence-based track, the **A2V track** from the [A2V: Asked to Verified](docs/METHOD.md) method:

```
Asked → Built → Proven → Reviewed → Shipped → Verified
```

A card moves only on evidence: a git diff, a test or data check that ran after the last edit, a PR approval, a deploy, a clean monitoring window. What an agent *says* never moves a card.

> **Status:** planning. No code yet. These docs are the source of truth.

**Planned install** (see [first run](docs/specs/first-run.md#adding-an-existing-repo)): from any existing repo, run `npx vantage add`, or `/plugin install vantage` then `/vantage add` inside Claude Code. Nothing in the repo changes unless you opt in with `--team`.

**Or install with a prompt** (end goal): paste this into Claude Code or Codex in your repo:

```text
Install Vantage in this repo. Follow https://github.com/ymatrix1/vantage/blob/main/docs/install-for-agents.md exactly: show me the dry run first, wait for my OK, then install, verify with vantage doctor, and tell me what changed.
```

## Documents

| Doc | What it covers |
|---|---|
| [A2V method](docs/METHOD.md) | The method Vantage implements: track, five rules, proof levels, signals |
| [PRD](docs/PRD.md) | Problem, pains, user, goals, non-goals, success metrics |
| [UX](docs/UX.md) | Surfaces (Focus, Board, Item, Ambient) and UX rules |
| [Architecture](docs/ARCHITECTURE.md) | Sources, event store, linker, scorers, surfaces, privacy |
| [Spec: lifecycle](docs/specs/lifecycle.md) | Stage gates, backward moves, flags, proof rules |
| [Spec: work item model](docs/specs/work-item-model.md) | Entities, anchors, linking rules |
| [Spec: flag registry](docs/specs/flags.md) | Every flag: trigger, severity, icon, one action |
| [Spec: proof](docs/specs/proof.md) | Proof types, strength levels, freshness, fake proof detection, the gate |
| [Spec: behaviors and detectors](docs/specs/behaviors-and-detectors.md) | Behavior sources, AI-decided and commitment detectors, resume with context |
| [Spec: data schema](docs/specs/data-schema.md) | Tables, immutability, migrations, merge linking |
| [Spec: visual language](docs/specs/visual-language.md) | Dot alphabet, proof shine, dot characters, landscape home, calm gamification |
| [Spec: Explain](docs/specs/explain.md) | Answer-first briefs, SCR, MECE issue trees with click-to-expand, via the connected agent |
| [Spec: pings](docs/specs/pings.md) | Who you owe a reply, who to nudge, who to tell it's done |
| [Spec: status line](docs/specs/status-line.md) | Text glyphs for the dot alphabet in the terminal |
| [Spec: first run](docs/specs/first-run.md) | `vantage init`, first view, one-time legend, demo mode |
| [Spec: decision log](docs/specs/decision-log.md) | Every AI or person decision, with five fields, who and status |
| [Spec: web UI](docs/specs/web-ui.md) | Navigation, screen states, keyboard map, API, performance budgets |
| [Spec: CI/CD](docs/specs/ci.md) | Docs checks now, code checks in Phase 1, releases later |
| [Mockups](docs/mockups/index.html) | Static HTML mockups with synthetic data |
| [Spec: scoring](docs/specs/scoring.md) | Priority, difficulty, spread, staleness |
| [Spec: ingestion](docs/specs/ingestion.md) | How each source is listened to: push, polling, cursors, relay |
| [Spec: operations](docs/specs/operations.md) | Identity, config, secrets, seen state, daemon, health, quality |
| [Roadmap](docs/ROADMAP.md) | Build phases and exit criteria |
| [Decisions](docs/DECISIONS.md) | Decision log |
| [Open questions](docs/OPEN-QUESTIONS.md) | What still needs deciding |
| [Landscape](docs/research/landscape.md) | Existing tools and why they don't cover this |
| [Research: Vibe Kanban](docs/research/vibe-kanban.md) | How Vibe Kanban drives Claude Code, and what it means for Vantage |

The **A2V plugin** in [`plugin/a2v/`](plugin/a2v/) packages the method for any project: a communication rule, an output style, and the skills `explain-top-down`, `prove-it` and `record-decision`. Install it with `/plugin marketplace add ymatrix1/vantage`, then `/plugin install a2v@vantage`.

Agent instructions: [AGENTS.md](AGENTS.md) (canonical), rules in `.agents/rules/`, skills in `.agents/skills/`. Tasks are tracked with [beans](https://github.com/hmans/beans) in `.beans/`.
