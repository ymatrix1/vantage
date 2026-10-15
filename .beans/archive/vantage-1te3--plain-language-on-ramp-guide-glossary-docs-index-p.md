---
# vantage-1te3
title: 'Plain-language on-ramp: guide, glossary, docs index, pt-BR'
status: completed
type: task
priority: normal
created_at: 2026-10-15T00:24:37Z
updated_at: 2026-10-15T00:31:47Z
parent: vantage-fmfh
---

## Context

Docs use consulting vocabulary (answer first, SCR, MECE, issue tree, A2V stages, proof levels L0 to L4, anchors, work items, flags, signals) with little explanation for newcomers. User feedback: people should understand what they see without reading specs. Blocked by: none.

## Higher Goal

A newcomer understands what Vantage shows and how to use it in minutes, and a lay reader can follow the method.

## Acceptance Criteria

- [x] docs/GUIDE.md: plain-language guide (what, problem, 5 steps, reading the Track page, what it never does, 5-minute routine, 10-question FAQ)
- [x] docs/GLOSSARY.md: A to Z with definition, example, spec link; method terms (Pyramid Principle, SCR, MECE, issue tree) with checked outside links
- [x] First-use definitions or glossary links in README, METHOD, PRD, UX and main specs; 'Terms' line on long specs
- [x] tools/check_docs.py: glossary terms exist, glossary links resolve; unit test
- [x] README top section 'What is Vantage' (60 seconds) with Learn more by audience; docs/README.md index
- [x] docs/pt-BR/GUIDE.md, GLOSSARY.md, README.md (sync list with source commit date), linked both ways
- [x] pnpm check, check_docs.py and unit tests pass after the last edit

## Out of Scope

Rewriting the technical specs. Translating specs other than GUIDE and GLOSSARY. The Track UI.

## Summary of Changes

Added docs/GUIDE.md, docs/GLOSSARY.md (46 entries, method terms with fetched outside links; none found for SCR itself, said so), docs/README.md index, README 'What is Vantage' section, first-use glossary links in README, METHOD, PRD and UX, a Terms line on ARCHITECTURE and every spec, docs/pt-BR/ (guide, glossary, README with source dates), tools/glossary_check.py with 12 unit tests wired into check_docs.py, D120 (proposed), ROADMAP lines, and the first-run spec's guided tour section (planned) with the Track UI first-run text.
