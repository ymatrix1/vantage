# Open questions

| # | Question | Notes |
|---|---|---|
| Q1 | **Work item boundaries.** When does one session's work become two items, or two sessions' work become one? | Proposal written in [work item model](specs/work-item-model.md#boundary-rules-proposal); validate against Phase 0 data. |
| Q2 | **Ghost detection quality.** How to propose ghosts from chat without flooding the board? | Probably an LLM proposal with user confirmation, capped per day. |
| Q3 | **Proof strength.** Is "test runner exited 0 after the last edit" enough for v1, or must proof reference changed code? | Start weak, measure false "proven" in Phase 0 data. |
| Q4 | **Judgment model.** Jev, a small LLM, or rules only? | Compare on ~100 labeled examples. Check company data policy first. |
| Q5 | **Monitoring source.** Which tools are actually in use (Datadog, Sentry, PagerDuty, Grafana, dbt Cloud alerts)? | Determines the first monitoring adapter. |
| Q6 | **Deploy signal.** Do the main repos use GitHub deployments, Actions environments, or something else? | Needed for Shipped. |
| Q7 | **Monitoring window length.** Default 2 days; per repo? | Data pipelines may need a longer window. |
| Q8 | **UI host.** Localhost page, VS Code panel, or desktop app mod? | Start with localhost; revisit after Phase 2. |
| Q9 | **Codex live events.** Is tailing session files enough? | Yes for v1 (see [ingestion](specs/ingestion.md)). Revisit if Codex adds hooks. |
| Q10 | **Slack, Jira and Linear access.** API tokens vs. MCP connectors; rate limits; company approval. | Needed before Phase 6. |
| Q11 | **Stop hook strictness.** When, if ever, should the gate block (exit 2) instead of warn? | Warn only until false positive rate is known. |
| Q12 | **Slack app approval.** Will the workspace admin allow a custom Slack app (Socket Mode, user-scoped events)? | If not, fall back to search polling with a user token, or the Slack connector through a scheduled agent. |
| Q13 | **Webhook relay.** Is a hosted relay for GitHub, Jira, Linear and monitoring webhooks acceptable under company policy? | Off by default; polling alone works. |
| Q14 | **Reviewing others' PRs.** Should `review_request` items appear on the main board or only in Focus and the digest? | Proposal: Focus and digest only, to keep the board about own work. |
| Q15 | **Multiple machines.** Is one laptop enough, or is sync needed later? | Out of scope for now. |
