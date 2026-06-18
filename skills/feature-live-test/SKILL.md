---
name: feature-live-test
description: "Run the generated test skill against a deployed PR environment. Executes integration tests, smoke tests, and LLM-as-a-Judge evaluations against a live URL. Collects evidence and posts results to Jira. Use after deployment to validate the feature works end-to-end."
---

# Feature Live Test — Test Against Deployed Environment

Run the test skill (generated in Phase 5) against the deployed PR environment (from Phase 6) to validate the feature works end-to-end.

## Constants

```
JIRA_CLOUD_ID = "151636d7-9099-4803-a108-4f053f36c9fe"
```

## Prerequisites

- Test skill generated (Phase 5): `.claude/skills/{feature}-test/SKILL.md`
- Test tool generated (Phase 5): `tools/{feature}/{feature}_chat.py`
- Environment deployed (Phase 6): PR environment URL available
- Test credentials available

---

## Instructions

### 1. Load Test Configuration

Read the build tracker (`docs/builds/{EPIC-ID}-{feature}.md`) to get:
- **App URL:** The frontend PR URL (primary test URL)
- **Python URL:** User-provided or staging
- **Test tool path:** `tools/{feature}/{feature}_chat.py`
- **Test skill path:** `.claude/skills/{feature}-test/SKILL.md`

### 2. Configure Test Tool for PR Environment

Override the test tool's environment config to point at the PR deployment:

```bash
cd tools/{feature}

# Create or update a PR environment config
python {feature}_chat.py login --env pr \
  --base-url "https://lxpfepr{N}.degreed.dev" \
  --python-url "{python-url}"
```

If the tool uses a JSON config (`{feature}_env.json`), update it:
```json
{
  "environments": {
    "pr": {
      "name": "PR Environment",
      "base_url": "https://lxpfepr{N}.degreed.dev",
      "python_url": "{python-url-from-phase-6}"
    }
  }
}
```

### 3. Login with Test Credentials

```bash
python {feature}_chat.py login --env pr
```

**Test credentials:**
- For `Local` environment deploys: use the standard dev test user
- For `Staging` deploys: use the staging test user
- Credentials should be in the tool's env config or provided by the user

If login fails, check:
- Is the deployment actually running? (curl the health endpoint)
- Are the credentials correct for this environment?
- Is the auth flow different for PR environments?

### 4. Run Test Scenarios

Execute tests in order — stop on critical failures, continue on warnings.

**Launch testing, UI verification, and monitoring in parallel** — three agents in a single message:
```python
Agent({ description: "Run live API tests against PR env", model: "opus",
        prompt: """Run the test tool against the PR environment.
        Tool: tools/{feature}/{feature}_chat.py
        Environment: pr (URL: {pr-url})

        Execute in order:
        1. cmd_smoke — full happy path end-to-end
        2. cmd_integration — cross-service flow verification
        3. cmd_{primary-feature-flow} — the main feature scenarios
        4. cmd_evaluate — LLM-as-a-Judge for AI response quality (if applicable)
        5. cmd_verify — verify all results

        For each scenario, record:
        - Command run
        - HTTP status codes received
        - Response summaries (not full bodies)
        - PASS/FAIL verdict
        - Any error messages

        If a test FAILS:
        - Note the exact error
        - Check if it's an environment issue (timeout, connection) vs a code bug
        - Continue with remaining tests unless it's a blocker
        """ })

Agent({ description: "Run Playwright UI pass against PR env", model: "opus",
        prompt: """MANDATORY when fe-workspace has changes — SKIP only if the feature is API-only.

        Run the generated Playwright suite at tools/{feature}/playwright/ against the deployed PR env.

        Setup:
        cd tools/{feature}/playwright
        npx playwright install chromium  # if not installed
        export PLAYWRIGHT_BASE_URL=https://lxpfepr{N}.degreed.dev
        export TEST_USER_EMAIL=... TEST_USER_PASSWORD=...
        npx playwright test --reporter=list,html

        For each test, record: PASS/FAIL, duration, screenshot path, console errors captured, axe violations found.

        Or — equivalently — drive Playwright directly via the MCP (verify exact namespace via ToolSearch on first call; likely `mcp__playwright__*`):
        1. browser_navigate(https://lxpfepr{N}.degreed.dev) → expect 200, no console errors
        2. Login flow → fill credentials, click submit, assert redirected to /home
        3. browser_navigate to feature route → assert primary CTA is visible (semantic selector)
        4. Exercise the feature flow (browser_click, browser_type)
        5. browser_take_screenshot at each significant state → save to docs/builds/{EPIC-ID}-evidence/
        6. browser_console_messages → ANY console error = test FAIL
        7. browser_evaluate(axe.run()) → ANY WCAG 2.2 AA violation = test FAIL

        Pass criteria (ALL must be true for UI PASS):
        - All Playwright tests green
        - Zero console errors on every page visited
        - Zero axe violations at WCAG 2.2 AA
        - Visual snapshot matches Figma reference (if baseline exists) within 5% pixel diff

        Save the run's HTML report (playwright-report/) and all screenshots to docs/builds/{EPIC-ID}-evidence/.
        Skip with a clear note in the test report ONLY if there are no fe-workspace changes in scope.
        """ })

Agent({ description: "Monitor Datadog during tests", model: "opus",
        prompt: """Monitor Datadog for errors while tests are running.
        Use the feature-datadog-monitor skill instructions.
        Services: service:degreed.web.next, service:degreed-coach-builder
        Time window: last 15 minutes (refresh as tests progress)
        Report any errors, exceptions, or latency spikes.""" })
```

### 5. Evidence Collection

For each test scenario, collect and structure evidence:

```markdown
## Test Results — {Feature Name}

**Environment:** {PR URL}
**Date:** {today}
**Test Tool:** tools/{feature}/{feature}_chat.py

### Scenario Results

| # | Scenario | Command | Status | Duration | Notes |
|---|---------|---------|--------|----------|-------|
| 1 | Smoke Test | `cmd_smoke` | PASS/FAIL | {s} | {notes} |
| 2 | Integration | `cmd_integration` | PASS/FAIL | {s} | {notes} |
| 3 | {Main flow} | `cmd_{flow}` | PASS/FAIL | {s} | {notes} |
| 4 | LLM Evaluation | `cmd_evaluate` | PASS/FAIL | {score} | {criteria results} |
| 5 | Playwright UI happy path | `playwright test happy-path` | PASS/FAIL | {s} | {evidence path} |
| 6 | Playwright console errors | `playwright test no-console-errors` | PASS/FAIL | {s} | {error list if any} |
| 7 | Axe a11y scan | `playwright test a11y` | PASS/FAIL | {s} | {violation count} |
| 8 | Visual vs Figma | `playwright test visual` | PASS/FAIL | {s} | {pixel diff %} |

### Visual Evidence
Screenshots and Playwright HTML report saved to `docs/builds/{EPIC-ID}-evidence/`. Embed key screenshots in the Confluence build tracker page and link from the Jira testing comment.

### Failures (if any)

#### Failure 1: {scenario name}
- **Error:** {exact error message}
- **HTTP Status:** {code}
- **Root Cause:** {environment issue / code bug / data issue}
- **Datadog Trace:** {link or trace ID if available}

### Datadog Health During Tests
{From the parallel monitoring agent — errors, latency, exceptions}

### Verdict
- [ ] All smoke tests pass
- [ ] Integration flow works end-to-end
- [ ] LLM responses meet quality criteria
- [ ] No errors in Datadog logs
- **Overall: PASS / PASS WITH ISSUES / FAIL**
```

### 6. Handle Failures

**Environment failures (not code bugs):**
- Timeout → retry the test
- Connection refused → check if deployment is still running
- Auth failure → re-login and retry

**Code bugs found:**
- Document the bug with reproduction steps
- Check if it exists in the approach's code or is a pre-existing issue
- If it's a new bug, create a Jira sub-task:
  ```
  [AI] Bug Found — {description} ({EPIC-ID})
  ```

**If tests mostly pass with minor issues:**
- Proceed but note the issues in the build tracker
- Post them on the Jira Epic for visibility

### 7. Update Build Tracker

Add test results to `docs/builds/{EPIC-ID}-{feature}.md`:

```markdown
## Phase 7: Live Testing

**Completed:** {date}
**Environment:** {PR URL}
**Test Tool:** tools/{feature}/{feature}_chat.py

### Results
| Scenario | Verdict |
|----------|---------|
| Smoke | {PASS/FAIL} |
| Integration | {PASS/FAIL} |
| {Main flow} | {PASS/FAIL} |
| LLM Evaluation | {PASS/FAIL} |

**Overall Verdict:** {PASS / PASS WITH ISSUES / FAIL}
**Issues Found:** {count}
**Bugs Created:** {Jira IDs if any}
```

### 7.5. Send Phone Notification (mandatory after every test run)

Pipeline rule — fire detailed notifications. Title auto-prefixed with `[{EPIC-ID}]`.

**All scenarios pass — include performance + Datadog summary:**
```bash
.claude/scripts/notify.sh "Tests · {pass}/{total} green" \
  "All scenarios pass on {pr-env-url}. Performance p95: {N}ms (baseline {M}ms, delta {±}). Datadog: {N} traces, 0 errors over test window. Evidence: docs/builds/{epic}-evidence/. Phase 8 monitoring ready." \
  default white_check_mark "{pr-env-url}"
```

**Any test fails — include FULL detail: which scenarios, first error, Datadog trace link:**
```bash
.claude/scripts/notify.sh "Tests FAILED · {fail}/{total}" \
  "Failed scenarios: {comma-list}. First failure: '{exact error message — first 200 chars}' at {file:line or test-name}. Datadog: {N} errors, top trace: {trace-url}. HTTP status pattern: {e.g. '3 × 500, 1 × 422'}. Evidence saved to docs/builds/{epic}-evidence/. Suggested: {fix-and-retest / investigate / amend-plan if test was wrong}." \
  high warning "{datadog-trace-url-or-evidence-path}"
```

**Partial pass with warnings:**
```bash
.claude/scripts/notify.sh "Tests · {pass}/{total} · WARNINGS" \
  "Mostly green but: {N} flaky retries on {scenario-name}, {M} a11y violations on {route}, {K} console errors. See evidence for details. Awaiting your call: ship anyway / fix first / re-run." \
  default warning "{evidence-path}"
```

See `.claude/rules/feature-pipeline.md` § Phone Notifications for the full matrix and per-feature tagging mechanism.

### 8. Update Jira

Post on the Epic:
```
[Agent Maestro-Test] Live Testing Complete

Environment: {PR URL}
Test Scenarios: {count} run, {pass} passed, {fail} failed

Results:
- Smoke: {PASS/FAIL}
- Integration: {PASS/FAIL}
- Feature flow: {PASS/FAIL}
- LLM quality: {PASS/FAIL}

Overall: {PASS / PASS WITH ISSUES / FAIL}

{If issues: list them}
{If bugs created: list Jira IDs}

Datadog health: {clean / errors found}
```

### 9. Present Checkpoint

> **Phase 7 Complete: Live Testing**
>
> | Scenario | Verdict |
> |----------|---------|
> | Smoke | {PASS/FAIL} |
> | Integration | {PASS/FAIL} |
> | Feature flow | {PASS/FAIL} |
> | LLM quality | {PASS/FAIL} |
>
> **Overall: {PASS / PASS WITH ISSUES / FAIL}**
> **Datadog: {clean / issues}**
>
> **What would you like to do?**
> - "proceed to monitoring" → Extended Datadog monitoring
> - "fix the failures" → Debug and fix, then re-test
> - "re-test" → Run tests again
> - "this is fine, wrap up" → Skip monitoring, go to approach selection
> - "stop" → Pipeline paused

---

## Validation Loop

Phases 6-8 form a **validation loop** that can repeat:

```
Deploy → Test → Monitor → Find issues → Fix → Re-deploy → Re-test → Re-monitor
```

Each iteration updates the build tracker with new results. The user decides when to exit the loop.
