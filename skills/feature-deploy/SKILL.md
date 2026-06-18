---
name: feature-deploy
description: "Deploy feature PRs to test environments via GitHub Actions /deploy comments. Handles .NET and frontend PR deployments, Python service URL from user, monitors deployment status, auto-retries failures. Use after implementation to get a live environment for testing."
---

# Feature Deploy — PR Environment Deployment

Deploy the selected approach's PRs to a test environment so the feature can be tested live.

## Constants

```
JIRA_CLOUD_ID = "151636d7-9099-4803-a108-4f053f36c9fe"
```

## PR Deployment Capabilities by Repo

| Repo | PR Deploy? | How | URL Pattern |
|------|-----------|-----|------------|
| **Degreed (.NET)** | YES | `/deploy` comment on PR | `https://pr{N}.degreed.dev` |
| **fe-workspace (Angular)** | YES | `/deploy` comment on PR | `https://lxpfepr{N}.degreed.dev` |
| **degreed-coach-builder (Python)** | YES | Push branch + open PR (workflow auto-deploys) | `https://pr-{N}.dgcoachbuilder-api.degreed.dev/` |
| **degreed-assistant (Python DGA)** | NO | User deploys manually | — |
| **degreed-flutter (Mobile)** | NO | No deploy, API-only testing | — |

## Deploy Decision Tree — Pick Your Case First

Identify which case your PRs fall into based on which layers actually changed. The deploy sequence depends entirely on the case — do NOT just run every step blindly.

| Case | Layers Changed | Deploy Sequence | Test URL |
|------|---------------|-----------------|----------|
| **1** | FE + .NET + Python | Python → push .NET URL hardcode commit → FE w/ `be-ref={dotnet-branch}` (FE deploy auto-deploys .NET) | `lxpfepr{N}.degreed.dev` |
| **2** | .NET + Python | Python → hardcode URL in .NET PR → deploy .NET | `pr{N}.degreed.dev` |
| **3** | Python only | Python → **clone `main` in Degreed → temp .NET PR with hardcoded URL → deploy that temp PR** | `pr{N}.degreed.dev` |
| **4** | FE only | Deploy FE PR (only) — points to **staging** .NET + Python | `lxpfepr{N}.degreed.dev` |
| **5** | .NET only | Deploy .NET PR (only) — points to **staging** Python + FE | `pr{N}.degreed.dev` |

**Core invariant:** Tests always traverse `pr{N}.degreed.dev` (.NET PR env) or `lxpfepr{N}.degreed.dev` (FE PR env). Python is never tested directly. So:
- Whenever Python has a PR, .NET MUST be redeployed with the Python URL hardcoded — even if .NET itself wasn't touched (Case 3 needs a temp .NET clone branch off `main`)
- When only FE or only .NET changed (Cases 4, 5), the PR env auto-resolves the untouched layers from **staging** — do NOT deploy other layers separately

**Cleanup at Step 9 (revert before merge):**
- Cases 1, 2: revert `_baseUrl` hardcodes (5–6 .NET orchestrators). **Python side has nothing to revert** — `prcheck.yml`, `deploy.ps1`, and `deployrealtime.ps1` are NOT edited anymore (the workflow auto-substitutes `pr-${{ github.event.number }}`).
- Case 3: same as above + close the temp .NET PR + delete the temp .NET clone branch
- Cases 4, 5: nothing to revert

**🚨 CRITICAL — Temp `_baseUrl` commits STAY in the PR until the user explicitly says otherwise.**
The temp commits to the .NET `_baseUrl` hardcodes (5–6 orchestrators) are required for the PR environment to remain testable across the entire pipeline (Phase 6 deploy → Phase 7 live test → Phase 8 Datadog monitoring → Phase 9 approach selection → user QA). **DO NOT auto-revert** these commits at any phase boundary. Only revert when the user says one of: "remove temp commits", "revert deploy commits", "ready to merge", or similar explicit instruction. Until then, leave them in place — even after tests pass, even after critic verdict, even after approach selection.

Note: Python `prcheck.yml`, `deploy.ps1`, `deployrealtime.ps1`, and `realtime.py` are no longer in the temp-commits list because they no longer need PR-specific edits — the workflow handles PR number substitution automatically.

---

## Instructions

### 1. Determine What to Deploy + Classify the Case

Read the build tracker to find the selected approach's PRs. If no approach is selected yet, ask the user which approach to deploy.

For each repo with a PR:
- Note the PR number
- Note the branch name
- Note the repo (degreed/Degreed, degreed/fe-workspace, degreed/degreed-coach-builder)

**Then classify the case** using the Decision Tree above. Which layers actually have PRs/changes? Cases 1–5 dictate the exact step ordering below — only run the steps marked applicable for your case.

### 2. Deploy .NET (applies to Cases 2, 3, 5)

When to run by case:
- **Case 1** — SKIP this `/deploy` command. Push the .NET URL hardcode commit but do NOT post `/deploy` on the .NET PR. The FE deploy with `be-ref` (Step 4) will deploy .NET as part of the integrated env.
- **Case 2** — Run AFTER Python (Step 5) is deployed and the URL is hardcoded in the .NET PR.
- **Case 3** — Run AFTER creating the temp .NET clone branch + temp PR (see Step 5C) and hardcoding the URL in that clone.
- **Case 4** — SKIP. FE-only deploys use staging .NET.
- **Case 5** — Run directly. No Python deploy needed; staging Python is used.

**Post the deploy command as a PR comment:**
```bash
gh pr comment {pr-number} --repo degreed/Degreed --body "/deploy environment=Local"
```

**Environment options (CASE-SENSITIVE):**
| Command | Target DB | Frontend |
|---------|----------|---------|
| `/deploy environment=Local` | Dev database | Local copy of FE files |
| `/deploy environment=LocalStaging` | Staging database | Local copy of FE files |
| `/deploy environment=Staging` | Staging database | Staging CDN |
| `/deploy environment=Release` | Release database | Release CDN |

**Default for testing:** Use `Local` — it targets the Dev database with local FE files.

**To deploy with a specific frontend branch:**
```
/deploy environment=Local
fe-ref={frontend-branch-name}
```

### 3. Poll .NET Deployment Status

After posting the comment, GitHub Actions starts a deployment workflow. Monitor it:

**Poll PR comments for status badges:**
```bash
# Check latest comments on the PR
gh api repos/degreed/Degreed/issues/{pr-number}/comments --jq '.[-3:][] | {body: .body[0:200], created_at: .created_at}'
```

**Look for these status markers in comments:**
1. "PR Deployment Started" — deployment is running
2. "PR Deployment Complete" — deployment succeeded, contains the app URL
3. "PR Deployment Failed" — build failed

**Poll every 60 seconds** until you see "Complete" or "Failed". Deployment typically takes 5-15 minutes.

**If deployment fails:**
```bash
# Extract the run ID from the status comment (it contains a GitHub Actions URL)
# e.g., https://github.com/degreed/Degreed/actions/runs/24662460689
# Restart only the failed jobs:
gh run rerun {run-id} --failed --repo degreed/Degreed
```

If it fails twice, stop and ask the user:
> .NET deployment failed twice. Actions run: {link}. Would you like me to retry, or do you want to investigate?

**Extract the environment URL** from the deployment complete comment:
- App URL pattern: `https://pr{number}.degreed.dev` or `https://lxpfepr{number}.degreed.dev`
- Datadog logs link (save this for Phase 8)

### 4. Deploy Frontend (applies to Cases 1, 4)

When to run by case:
- **Case 1** — Run with `be-ref={dotnet-branch}` so FE + .NET deploy together as an integrated env.
- **Case 4** — Run WITHOUT `be-ref`. FE-only deploy uses staging .NET + staging Python.
- **Cases 2, 3, 5** — SKIP. No FE PR exists.

Post the deploy command with a `be-ref` pointing to the .NET branch (Case 1) or without it (Case 4):

```bash
gh pr comment {pr-number} --repo degreed/fe-workspace --body "/deploy environment=Local be-ref={dotnet-branch-name}"
```

**Environment options (CASE-SENSITIVE):**
| Command | Target DB | Frontend |
|---------|----------|---------|
| `/deploy environment=Local` | Dev database | Local copy of FE files |
| `/deploy environment=Staging` | Staging database | Local copy of FE files |
| `/deploy environment=Release` | Release database | Release CDN |

**Why `be-ref` matters:** The frontend PR needs to know which .NET backend to call. By setting `be-ref={dotnet-branch}`, the frontend deployment spins up with the .NET PR's code, creating a fully integrated environment.

**Poll for completion** — same pattern as .NET. Extract the frontend app URL.

**The frontend PR URL is the one you use for testing** — it has both the frontend changes AND points to the .NET PR backend.

### 5. Handle Python Service (degreed-coach-builder)

> **STEP ORDER NOTE:** This step runs **FIRST** in Cases 1, 2, 3 — before .NET (Step 2) and FE (Step 4) — because the .NET orchestrators must be hardcoded with the Python URL before .NET deploys. The "Step 5" numbering reflects document position only. In Cases 4 and 5, this step is SKIPPED entirely.

**Python PR deploy is now fully automatic.** The `prcheck.yml` workflow on `main` bakes in `pr-${{ github.event.number }}.dgcoachbuilder-api.degreed.dev` as the HOSTURL and the `deploy-pr-ai-staging` job fires automatically on any `pull_request` that touches paths under `backend/**`, the workflow files, or the deploy `.ps1` scripts. **No file edits are required on the Python branch.**

**When to run by case:**
- **Cases 1, 2** — Run FIRST. Push the Python branch, open the PR; the workflow auto-deploys. Then hardcode the resulting URL in the existing .NET PR (Step 5B).
- **Case 3 (Python only, no .NET PR)** — Run FIRST AND follow Step 5C to create a temporary .NET clone branch off `main` so the URL has somewhere deployable to live.
- **Cases 4, 5** — SKIP. PR env points to staging Python automatically.

**Present options to the user (only if ambiguous):**
> The Python service needs deployment. How should we handle it?
>
> 1. **"Deploy it"** — I'll push the branch and open the PR; the workflow auto-deploys. Then I'll hardcode the URL in .NET orchestrators.
> 2. **"I've already deployed it at {URL}"** — I'll just hardcode that URL in .NET orchestrators.
> 3. **"Use staging"** — Skip Python deployment (Cases 4, 5 default).
> 4. **"Skip Python testing"** — Last resort; test only .NET + frontend layers.

**If user says "Deploy it" — Full Python PR Deployment:**

#### Step A: Push branch + open PR (workflow auto-deploys)

No file edits. No `prcheck.yml` changes. No `.ps1` changes. No `realtime.py` edits.

```bash
cd degreed-coach-builder
# branch + commit your actual feature code as normal
git push -u origin {branch-name}
gh pr create --title "{title}" --body "{body}"
```

That's it. As soon as the PR is open (and at least one path in the workflow's trigger list changed — `backend/**`, the workflows, or `deploy.ps1`/`deployrealtime.ps1`), the PR Checks workflow fires automatically:

1. `build-and-push` builds the image
2. `create-pr-fic` creates the Azure federated identity credential for the PR namespace
3. `deploy-pr-ai-staging` deploys to `pr-${{ github.event.number }}.dgcoachbuilder-api.degreed.dev` in namespace `dgcoachbuilder-pr-{N}`

The resulting URL is:
```
https://pr-{PR-NUMBER}.dgcoachbuilder-api.degreed.dev/
```

Poll the PR's GitHub Actions run for completion — same pattern as .NET deployment (check PR comments or `gh run list`). Typical deploy time: 8–15 minutes.

**Caveat — workflow path trigger:**
The `prcheck.yml` only runs if the PR touches one of these paths:
```
.github/workflows/main.yml
.github/workflows/build-and-push.yml
.github/workflows/helm-deploy.yml
.github/workflows/prcheck.yml
.github/workflows/pytest-llm-eval.yml
backend/**
devops/infra/degreed-coach-builder-api/**
devops/infra/degreed-coach-realtime/**
devops/infra/deployrealtime.ps1
devops/infra/deploy.ps1
```
If your feature only changes docs or non-backend files, the workflow won't fire and no PR env will exist. For features that fit this case, either include a no-op `backend/**` touch (e.g. comment in `__init__.py`) or use staging Python (Case 4/5).

#### Step C: Case 3 — Create Temp .NET Clone Branch (Python-only PRs)

**Skip this section unless you're in Case 3** (only degreed-coach-builder has changes; no .NET PR exists).

When ONLY Python changed and there's no .NET PR, you cannot just hardcode the URL — you need a deployable .NET branch. Create a temporary one off `main`:

```bash
cd Degreed
git checkout main
git pull origin main
git checkout -b feature/{epic}-tmp-py-url-{python-pr-N}
# Now perform Step B's hardcode edits on this fresh branch (5 or 6 orchestrators)
git add trunk/Degreed.Common.Standard/Orchestrators/CoachOrchestrator.cs \
        trunk/Degreed.Common.Standard/Orchestrators/RoleplayOrchestrator.cs \
        trunk/Degreed.Common.Standard/Orchestrators/QuizOrchestrator.cs \
        trunk/Degreed.Common.Standard/Orchestrators/MaestroStudioOrchestrator.cs \
        trunk/Degreed.Common.Standard/Orchestrators/MaestroFileOrchestrator.cs
git commit -m "temp: point orchestrators to pr-{python-pr-N} for testing (DO NOT MERGE)"
git push -u origin feature/{epic}-tmp-py-url-{python-pr-N}
gh pr create --repo degreed/Degreed \
  --title "TEMP: hardcode Python URL for pr-{python-pr-N} testing" \
  --body "Temporary PR to provide a deployable .NET env for testing degreed-coach-builder PR #{python-pr-N}. DO NOT MERGE."
```

Then proceed to Step 2 (`/deploy environment=Local` on this temp .NET PR). Test URL becomes `pr{N}.degreed.dev` where N is the temp .NET PR number.

**Cleanup at Step 9:**
```bash
gh pr close {temp-pr-N} --repo degreed/Degreed --comment "Temp PR for Python testing — closing post-test"
git push origin --delete feature/{epic}-tmp-py-url-{python-pr-N}
```

Track the temp branch + PR number in the build tracker's "Temporary Changes" table so cleanup isn't missed.

#### Step B: Hardcode the Python URL in .NET orchestrators

Once the Python PR is deployed, its URL is:
```
https://pr-{PR-NUMBER}.dgcoachbuilder-api.degreed.dev/
```

Now hardcode this in ALL 5 Maestro orchestrators in the Degreed repo (same pattern as before):

**If user provides a URL directly (already deployed):**

**Steps:**

1. **Use the Edit tool to replace the `_baseUrl` assignment in each orchestrator.** The replacement is simple — one line for one line:

   ```csharp
   // Find this line:
   _baseUrl = configManager.GetValue(CoachAiBackendRoutes.ConfigKey);

   // Replace with:
   _baseUrl = "{user-provided-python-url}";
   ```

   **Do this in ALL 5 Maestro orchestrators:**

   | # | File Path | Find | Replace With |
   |---|-----------|------|-------------|
   | 1 | `trunk/Degreed.Common.Standard/Orchestrators/CoachOrchestrator.cs` | `_baseUrl = configManager.GetValue(CoachAiBackendRoutes.ConfigKey);` | `_baseUrl = "{url}";` |
   | 2 | `trunk/Degreed.Common.Standard/Orchestrators/RoleplayOrchestrator.cs` | `_baseUrl = configManager.GetValue(CoachAiBackendRoutes.ConfigKey);` | `_baseUrl = "{url}";` |
   | 3 | `trunk/Degreed.Common.Standard/Orchestrators/QuizOrchestrator.cs` | `_baseUrl = configManager.GetValue(CoachAiBackendRoutes.ConfigKey);` | `_baseUrl = "{url}";` |
   | 4 | `trunk/Degreed.Common.Standard/Orchestrators/MaestroStudioOrchestrator.cs` | `_baseUrl = configManager.GetValue(CoachAiBackendRoutes.ConfigKey);` | `_baseUrl = "{url}";` |
   | 5 | `trunk/Degreed.Common.Standard/Orchestrators/MaestroFileOrchestrator.cs` | `_baseUrl = configManager.GetValue(CoachAiBackendRoutes.ConfigKey);` | `_baseUrl = "{url}";` |

   **If DGA is also in scope:**
   | 6 | `trunk/Degreed.Common.Standard/Orchestrators/DegreedAssistantOrchestrator.cs` | `_baseUrl = configManager.GetValue(DegreedAssistantRoutes.ConfigKey);` | `_baseUrl = "{url}";` |

   **Example using Edit tool:**
   ```
   Edit(
     file_path: "Degreed/trunk/Degreed.Common.Standard/Orchestrators/CoachOrchestrator.cs",
     old_string: '_baseUrl = configManager.GetValue(CoachAiBackendRoutes.ConfigKey);',
     new_string: '_baseUrl = "https://coachdev.ap.loclx.io/";'
   )
   ```

   Do all 5 (or 6) edits in parallel — they're independent files.

2. **Commit and push** on the .NET PR branch:
   ```bash
   cd Degreed
   git add trunk/Degreed.Common.Standard/Orchestrators/CoachOrchestrator.cs \
             trunk/Degreed.Common.Standard/Orchestrators/RoleplayOrchestrator.cs \
             trunk/Degreed.Common.Standard/Orchestrators/QuizOrchestrator.cs \
             trunk/Degreed.Common.Standard/Orchestrators/MaestroStudioOrchestrator.cs \
             trunk/Degreed.Common.Standard/Orchestrators/MaestroFileOrchestrator.cs
   git commit -m "temp: point orchestrators to custom Python URL for PR testing"
   git push
   ```

3. **THEN deploy the .NET PR** — the `/deploy` comment triggers after the push.

4. **Verify connectivity:**
   ```bash
   curl -s {user-provided-url}/dgcb/api/health
   ```

**REVERT — only when user explicitly asks.**
The `_baseUrl` hardcodes MUST stay in the PR through the entire pipeline so the env stays testable. (Python side no longer needs temp edits — workflow auto-deploys on PR creation.) Do NOT revert at phase boundaries, after tests pass, or after approach selection. Wait for an explicit instruction like "remove temp commits", "revert deploy commits", or "ready to merge".

To revert, use the same Edit tool to replace back:
```
Edit(
  old_string: '_baseUrl = "https://coachdev.ap.loclx.io/";',
  new_string: '_baseUrl = configManager.GetValue(CoachAiBackendRoutes.ConfigKey);'
)
```
Do all 5 files, commit: `git commit -m "revert: restore configManager URL after PR testing"`, push.

Track in the build tracker:
```markdown
## Temporary Changes (Revert Before Merge)
| File | Change | Reason | Reverted? |
|------|--------|--------|-----------|
| CoachOrchestrator.cs | _baseUrl hardcoded | PR testing | Yes/No |
| RoleplayOrchestrator.cs | _baseUrl hardcoded | PR testing | Yes/No |
| QuizOrchestrator.cs | _baseUrl hardcoded | PR testing | Yes/No |
| MaestroStudioOrchestrator.cs | _baseUrl hardcoded | PR testing | Yes/No |
| MaestroFileOrchestrator.cs | _baseUrl hardcoded | PR testing | Yes/No |
  ```
- Leave the hardcoded URL in place until the user explicitly says "remove temp commits" or "ready to merge". Do NOT auto-revert at approach selection or any other phase boundary.

**If user says "use staging":**
- No code changes needed — the PR .NET environment already points to staging Python by default via Azure App Configuration.
- Note: staging Python may NOT have the user's changes. This is only useful for testing the .NET + frontend layers in isolation.

### 6. Handle Flutter

Flutter has no deployment capability. Note this in the build tracker:
> Flutter: API-only testing. Mobile UI testing requires a physical device/emulator connected to the PR environment API.

Flutter-specific API testing can still happen via the test tool — it just calls the .NET API endpoints that the Flutter app would call, using a different auth method (token-based instead of cookie-based).

### 7. Run Smoke Test

Before declaring deployment complete, verify the basics work.

#### 7a. HTTP smoke (always run)
```bash
# Check .NET health
curl -s https://{pr-env-url}/health

# Check login page loads
curl -s -o /dev/null -w "%{http_code}" https://{pr-env-url}/account/login

# Check API is responsive
curl -s -o /dev/null -w "%{http_code}" https://{pr-env-url}/api/coach/status

# If Python deployed (Cases 1, 2, 3): check Python health
curl -s {python-url}/dgcb/api/health
```

#### 7b. Playwright UI smoke (MANDATORY when fe-workspace has changes — Cases 1, 4)

A 200-OK on `/api/coach/status` doesn't catch white-screen-of-death, missing assets, or console errors. For any deploy that includes FE changes, drive a real browser via the Playwright MCP (verify exact namespace via `ToolSearch` on first call; likely `mcp__playwright__*`):

```
browser_navigate({url: "https://lxpfepr{N}.degreed.dev"})
browser_console_messages()                   # capture any JS errors during initial load
browser_snapshot()                            # accessibility tree — confirm primary nav rendered
browser_take_screenshot({path: "docs/builds/{EPIC-ID}-evidence/deploy-smoke-home.png"})
# Optional but recommended: navigate to feature route
browser_navigate({url: "https://lxpfepr{N}.degreed.dev/{feature-route}"})
browser_console_messages()
browser_take_screenshot({path: "docs/builds/{EPIC-ID}-evidence/deploy-smoke-feature.png"})
```

**Pass criteria (all must be true):**
- HTTP smoke (7a) returns 200 / expected codes
- `browser_console_messages()` returns zero errors on each page
- `browser_snapshot()` shows the primary navigation, header, and feature route content rendered
- Screenshots are non-empty (no white screen)

**If any check fails**, report it and ask the user before proceeding. Save screenshots and console logs to `docs/builds/{EPIC-ID}-evidence/` regardless of pass/fail so the live-test phase has a baseline to compare against.

**Skip 7b** for Cases 2, 3, 5 (no FE changes) — HTTP smoke is sufficient. Note the skip in the build tracker.

### 8. Update Build Tracker

Add the deployment details to `docs/builds/{EPIC-ID}-{feature}.md`:

```markdown
## Deployment

| Repo | PR | Deploy Command | Environment URL | Status |
|------|-----|---------------|-----------------|--------|
| Degreed (.NET) | #{number} | `/deploy environment=Local` | https://pr{N}.degreed.dev | Deployed |
| fe-workspace | #{number} | `/deploy environment=Local be-ref={branch}` | https://lxpfepr{N}.degreed.dev | Deployed |
| degreed-coach-builder | N/A | User-provided / Staging | {url} | {status} |
| degreed-flutter | N/A | No deploy | API-only testing | — |

### Environment URLs
- **App URL (use this for testing):** {frontend PR URL}
- **Datadog Logs (.NET):** {link from deploy comment}
- **Datadog Logs (Python):** {link if available}

### Deploy Status
- .NET: {Deployed / Failed / Retried}
- Frontend: {Deployed / Failed / Retried}
- Python: {User-provided URL / Staging / Skipped}
```

### 8.5. Send Phone Notification (mandatory for any deploy)

Pipeline rule (`.claude/rules/feature-pipeline.md` § Phone Notifications) — fire detailed notifications. The script auto-prefixes title with `[{EPIC-ID}]` from `CLAUDE_FEATURE_ID` env var.

**Deploy started (low priority — informational):**
```bash
.claude/scripts/notify.sh "Deploy started · {Case-N}" \
  "Deploying {layers-list}. Order: Python → hardcode .NET URL → FE w/ be-ref. Polling Actions every 60s; expect 5-15 min." \
  low rocket "{actions-url}"
```

**Deploy succeeded — include FULL detail:**
```bash
.claude/scripts/notify.sh "Deploy complete" \
  "Layers live: {Python: pr-{N}.dgcoachbuilder-api.degreed.dev | .NET: pr{N}.degreed.dev | FE: lxpfepr{N}.degreed.dev}. Smoke test: health 200, login 200, /api/coach/status 200. Build tracker updated. Phase 7 testing ready." \
  default rocket "{primary-test-url}"
```

**Deploy FAILED — include error excerpt + investigation link + suggested action:**
```bash
.claude/scripts/notify.sh "Deploy FAILED" \
  "Failed at: {which-step — e.g. '.NET PR build' or 'Python PR Checks workflow' or 'FE be-ref linkage'}. Error: '{first 200 chars of error from Actions log}'. After {N} retries. Actions run: {url}. Suggested: {investigate / retry / check Python URL hardcode / verify env-vars}. Pipeline halted." \
  high warning "{actions-url}"
```

This pings the user's phone with COMPLETE info — they should be able to decide what to do without checking the terminal.

### 9. Update Jira

Post a comment on the Epic:
```
[Agent Maestro-Deploy] PR Environment Deployed

.NET: https://pr{N}.degreed.dev (PR #{number})
Frontend: https://lxpfepr{N}.degreed.dev (PR #{number})
Python: {url or "staging"}

App URL for testing: {frontend URL}
Smoke test: PASSED

Ready for live testing.
```

### 10. Present Checkpoint

> **Phase 6 Complete: Deployment**
>
> | Repo | URL | Status |
> |------|-----|--------|
> | .NET | https://pr{N}.degreed.dev | Deployed |
> | Frontend | https://lxpfepr{N}.degreed.dev | Deployed |
> | Python | {url} | {status} |
>
> **App URL:** {frontend URL}
> **Smoke test:** PASSED
>
> **What would you like to do?**
> - "proceed to testing" → Run the test skill against this environment
> - "redeploy" → Re-trigger deployment
> - "deploy to staging instead" → Switch to staging environment
> - "stop" → Pipeline paused, deployment active

---

## Deployment Retry Logic

```
Deploy comment posted
    │
    ├── Poll every 60s for status
    │   ├── "Started" → keep polling
    │   ├── "Complete" → extract URL, proceed
    │   └── "Failed" → retry
    │
    ├── Retry #1: gh run rerun {id} --failed
    │   ├── Poll again
    │   └── If still fails → Retry #2
    │
    └── Retry #2: gh run rerun {id} (full restart)
        ├── Poll again
        └── If still fails → STOP, ask user
```

## Tips

- Always deploy .NET before frontend — the frontend needs the backend URL
- Use `be-ref` on the frontend PR to point to the .NET branch — this creates a fully integrated environment
- The frontend PR URL is the primary test URL (it includes both FE + BE)
- For features that ONLY touch Python (Case 3), create a temp .NET clone branch off `main` with the URL hardcoded, then deploy that temp .NET PR — tests must traverse `pr{N}.degreed.dev`, never Python directly
- Deployment takes 5-15 minutes — don't poll too aggressively (60s intervals)
- If the PR is a Draft, deployment still works — you don't need to mark it ready for review
