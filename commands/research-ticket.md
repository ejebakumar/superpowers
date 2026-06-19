# Research Ticket

Perform deep cross-repo research on a Jira ticket (Epic, Story, Bug, or Task).

## Arguments
- `$ARGUMENTS` — Jira ticket ID (e.g., `PD-1234`) or description of what to research

## Instructions

You are executing the **Feature Research** phase of the AI Native Feature Builder Pipeline. This performs comprehensive analysis without implementing anything.

### What This Does
1. Fetch the Jira ticket and all linked resources (Confluence pages, related tickets, external links)
2. Scan all 5 workspace repos for impact:
   - `degreed-coach-builder` (Python Maestro)
   - `Degreed` (.NET backend)
   - `fe-workspace` (Angular frontend)
   - `degreed-flutter` (Mobile)
   - `degreed-assistant` (DGA — only if relevant)
3. Map dependencies and cross-service communication
4. Search for related Jira tickets
5. Check Datadog for performance baselines (if relevant)
6. Produce a research document in `docs/plans/`
7. Post findings summary on the Jira ticket

### Execution

Load the `feature-research` skill and execute for: **$ARGUMENTS**

If the input is a Jira ticket ID, fetch it first via `mcp__atlassian__getJiraIssue`.
If the input is a description, use it directly as the research focus.

**Rules:**
- Use parallel Agent calls to search multiple repos simultaneously
- Don't just list files — read them and understand the current implementation
- Check domain model truths (Roleplay = Coach subtype, Form = Quiz-backed)
- Post findings on Jira when complete

### Jira Constants
- Cloud ID: `151636d7-9099-4803-a108-4f053f36c9fe`
