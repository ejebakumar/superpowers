# Deploy Feature

Deploy feature PRs to a test environment and optionally run live tests + Datadog monitoring.

## Arguments
- `$ARGUMENTS` — PR number, branch name, or Epic ID. If Epic ID, reads the build tracker for PR info.

## Instructions

You are executing the **Deployment + Testing** phases of the AI Native Feature Builder Pipeline (Phases 6-8).

### What This Does
1. **Phase 6: Deploy** — Post `/deploy` comments on .NET and frontend PRs, poll for completion, handle Python URL
2. **Phase 7: Live Test** — Run the generated test skill against the deployed environment
3. **Phase 8: Datadog Monitor** — Check logs/traces for errors, compare to baselines

### Execution

Load the `feature-deploy` skill first.

**For .NET:** `gh pr comment {N} --repo degreed/Degreed --body "/deploy environment=Local"`
**For Frontend:** `gh pr comment {N} --repo degreed/fe-workspace --body "/deploy environment=Local be-ref={dotnet-branch}"`
**For Python:** Ask user for URL or use staging.

Deploy order: .NET first → Frontend second (with be-ref).
Poll PR comments for "PR Deployment Complete". Auto-retry on failure (up to 2x).

After deployment, ask user if they want to run live tests and Datadog monitoring.

### Jira Constants
- Cloud ID: `151636d7-9099-4803-a108-4f053f36c9fe`

### Datadog Services
- `service:degreed.web.next` (.NET)
- `service:degreed-coach-builder` (Python FastAPI)
- `service:degreed-coach-realtime` (Voice)

Present checkpoints between each phase. The user drives the validation loop:
Deploy → Test → Monitor → Fix → Re-deploy → Re-test
