# Build Feature Pipeline

Run the full AI Native Feature Builder pipeline for a Jira Epic.

## Arguments
- `$ARGUMENTS` — Jira Epic ID (e.g., `PD-1234`) or full URL

## Instructions

You are executing the **AI Native Feature Builder Pipeline**. This is a multi-phase automated workflow that takes a Jira Epic and produces implementation PRs, documentation, and test skills.

### Pipeline Phases
1. **Intake** — Fetch Epic, follow links, extract requirements, post planning comment, create sub-tasks
2. **Deep Research** — Cross-repo impact scan, dependency mapping, related tickets, Datadog baselines
3. **Architecture Decision** — Define 3 approaches, trade-off analysis, write ADR
4. **Implementation ×3** — Implement each approach in its own branch with a PR
5. **Documentation** — Create Confluence page with full report
6. **Test Skill** — Auto-generate test skill + Python CLI tool

### Execution

Load the `feature-builder` skill and execute the full pipeline for Epic: **$ARGUMENTS**

**Critical rules:**
- Present checkpoints between each phase — don't run silently
- Post updates to Jira at each phase completion
- If the Epic is a bug (not a feature), adapt to single-approach mode
- If a phase fails, report the error and ask how to proceed
- Use parallel Agent calls where possible (e.g., multi-repo research)
- Always load the appropriate stack skill before implementing in a repo

### Jira Constants
- Cloud ID: `151636d7-9099-4803-a108-4f053f36c9fe`
- Instance: `degreedjira.atlassian.net`

Begin by fetching the Epic and running Phase 0 (Intake).
