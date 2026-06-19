---
name: feature-datadog-monitor
description: Use when system health needs to be verified in Datadog during or after live testing of a deployed feature — checking logs, traces, and metrics for errors, exceptions, or latency spikes against baselines.
---

# Feature Datadog Monitor — Observability Check

Monitor Datadog for errors, exceptions, latency spikes, and anomalies during and after live testing of a deployed feature.

## Constants

```
JIRA_CLOUD_ID = "151636d7-9099-4803-a108-4f053f36c9fe"
```

## Degreed Services in Datadog

| Service | Datadog Name | What It Runs |
|---------|-------------|-------------|
| .NET Backend | `service:degreed.web.next` | Controllers, orchestrators, SSE proxy |
| Python FastAPI | `service:degreed-coach-builder` | LLM, RAG, quiz, forms, post-processing |
| Python Voice | `service:degreed-coach-realtime` | LiveKit agents, WebRTC, voice |
| Dashboard Hub | `https://app.datadoghq.com/dashboard/lists` | All dashboards |

## PR Environment Filtering — CRITICAL

Each deployed PR has its own Datadog tags. You MUST use these to filter logs/traces to YOUR deployment, not all of staging.

### Tag Patterns by Deployment Source

**Python PR (degreed-coach-builder PR #{N}):**
```
env:pr-{N}-localstaging service:degreed-coach-builder     ← FastAPI logs
env:pr-{N}-localstaging service:degreed-coach-realtime    ← LiveKit voice logs
```
Example for PR #800:
```
env:pr-800-localstaging service:degreed-coach-builder
env:pr-800-localstaging service:degreed-coach-realtime
```

**.NET PR deployed via fe-workspace (fe-workspace PR #{N}):**
```
@branch:lxpfepr{N} service:degreed.web.next
```
Example for fe-workspace PR #2547:
```
@branch:lxpfepr2547 service:degreed.web.next
```

**.NET PR deployed directly (Degreed PR #{N}):**
```
@branch:pr{N} service:degreed.web.next
```
Example for Degreed PR #53979:
```
@branch:pr53979 service:degreed.web.next
```

### How to Determine Which Tags to Use

Read the build tracker's Deployment section to find:
- **Python PR number** → use `env:pr-{N}-localstaging`
- **Which repo triggered the .NET deploy:**
  - If deployed from fe-workspace PR → use `@branch:lxpfepr{N}`
  - If deployed from Degreed PR → use `@branch:pr{N}`
- **Frontend PR number** → for RUM: filter by the PR environment URL

---

## Instructions

### 1. Determine Monitoring Scope

Read the build tracker to identify:
- **Python PR number** (for `env:pr-{N}-localstaging` tag)
- **.NET deployment source** (fe-workspace PR or Degreed PR → determines `@branch` tag)
- **The PR environment URLs** (from Phase 6 deployment)
- **Baseline metrics** from Phase 1 research (if captured)

### 2. Check Logs for Errors

Use `mcp__datadog__get_logs` to search for errors **filtered by PR tags**.

**For Python FastAPI (filtered to THIS PR's env):**
```
Query: env:pr-{PYTHON_PR_NUMBER}-localstaging service:degreed-coach-builder status:error
Time: last 30 minutes (or since deployment)
```

**For Python Voice / LiveKit (filtered to THIS PR's env):**
```
Query: env:pr-{PYTHON_PR_NUMBER}-localstaging service:degreed-coach-realtime status:error
Time: last 30 minutes
```

**For .NET — deployed via fe-workspace:**
```
Query: @branch:lxpfepr{FE_PR_NUMBER} service:degreed.web.next status:error
Time: last 30 minutes
```

**For .NET — deployed via Degreed repo directly:**
```
Query: @branch:pr{DOTNET_PR_NUMBER} service:degreed.web.next status:error
Time: last 30 minutes
```

**IMPORTANT:** Always use the PR-specific tags. Without them, you'll see errors from ALL environments — staging, other PRs, production — which makes it impossible to tell what's from YOUR deployment.

**What to look for:**
- HTTP 5xx errors (server errors)
- Unhandled exceptions with stack traces
- Timeout errors (especially SSE and LLM calls)
- Authentication/authorization failures
- Redis connection errors
- Database query errors

### 3. Check Traces for Latency

Use `mcp__datadog__list_traces` to inspect request traces.

**Check for:**
- High latency spans (> 2s for API calls, > 30s for LLM calls)
- Failed spans (error=true)
- Span cascades indicating N+1 queries
- Missing spans (service boundary not instrumented)

**Compare against Phase 1 baselines:**
```markdown
| Endpoint | Baseline p95 | Current p95 | Delta | Status |
|----------|-------------|-------------|-------|--------|
| /api/coach/chat | 450ms | 520ms | +70ms | OK |
| /dgcb/api/sse/connect | 200ms | 180ms | -20ms | OK |
| /api/quiz/generate | 3.2s | 8.5s | +5.3s | WARNING |
```

### 4. Check RUM Events (if frontend changes)

Use `mcp__datadog__get_rum_events` to check for frontend issues.

**Search for:**
- JavaScript errors on the PR environment URL
- Long Task events (UI freezes > 50ms)
- Resource loading failures (4xx/5xx for assets)

Use `mcp__datadog__get_rum_page_performance` for page load metrics:
- Largest Contentful Paint (LCP) — should be < 2.5s
- First Input Delay (FID) — should be < 100ms
- Cumulative Layout Shift (CLS) — should be < 0.1

### 5. Check for Known Error Patterns

Look for these patterns, **always adding the PR-specific filter**:

**Python PR #{N} patterns** (prefix all with `env:pr-{N}-localstaging`):

| Pattern | Query | Severity |
|---------|-------|----------|
| LLM timeout | `env:pr-{N}-localstaging service:degreed-coach-builder "timeout" "openai"` | HIGH |
| Redis session lost | `env:pr-{N}-localstaging service:degreed-coach-builder "session" "not found"` | HIGH |
| Post-process failure | `env:pr-{N}-localstaging service:degreed-coach-builder "post_process" "error"` | MEDIUM |
| Quiz validation fail | `env:pr-{N}-localstaging service:degreed-coach-builder "quiz" "validation"` | LOW |
| LiveKit agent crash | `env:pr-{N}-localstaging service:degreed-coach-realtime "agent" "error"` | HIGH |
| Voice disconnect | `env:pr-{N}-localstaging service:degreed-coach-realtime "disconnect"` | HIGH |

**.NET patterns** (prefix with `@branch:lxpfepr{N}` or `@branch:pr{N}`):

| Pattern | Query | Severity |
|---------|-------|----------|
| SSE disconnect | `@branch:{tag} service:degreed.web.next "SSE" "disconnect"` | HIGH |
| Auth failure | `@branch:{tag} service:degreed.web.next "401" OR "403"` | MEDIUM |
| Orchestrator error | `@branch:{tag} service:degreed.web.next "orchestrator" "exception"` | HIGH |
| Python proxy timeout | `@branch:{tag} service:degreed.web.next "timeout" "coach"` | HIGH |

### 6. Produce Health Report

```markdown
## Datadog Health Report — {Feature Name}

**Time Window:** {start} to {end}
**Services Monitored:** {list}
**Environment:** {PR URL}

### Error Summary
| Service | Errors | Warnings | New Since Deploy |
|---------|--------|----------|-----------------|
| degreed.web.next | {count} | {count} | {count} |
| degreed-coach-builder | {count} | {count} | {count} |
| degreed-coach-realtime | {count} | {count} | {count} |

### New Errors (not in baseline)
| Time | Service | Error | Trace ID | Likely Cause |
|------|---------|-------|----------|-------------|
| {time} | {service} | {error message} | {trace ID} | {analysis} |

### Latency Comparison
| Endpoint | Baseline p95 | Current p95 | Status |
|----------|-------------|-------------|--------|
| {endpoint} | {ms} | {ms} | OK / WARNING / DEGRADED |

### RUM Health (if frontend)
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| LCP | < 2.5s | {s} | OK / WARNING |
| FID | < 100ms | {ms} | OK / WARNING |
| JS Errors | 0 | {count} | OK / ISSUES |

### Verdict
**Overall Health: HEALTHY / ISSUES FOUND / DEGRADED**

{If issues:}
**Action Required:**
1. {issue + recommended action}
2. {issue + recommended action}
```

### 7. Correlate Test Actions with Traces

If running alongside live testing (Phase 7), correlate test actions with Datadog traces:

1. Note the timestamp when each test command runs
2. Search for traces in that time window for the affected endpoint
3. Link test failures to specific Datadog traces
4. This provides a complete audit: "Test X failed because endpoint Y returned 500, trace ID Z shows the Python service threw a timeout on the LLM call"

### 8. Update Build Tracker

Add monitoring results to `docs/builds/{EPIC-ID}-{feature}.md`:

```markdown
## Phase 8: Datadog Monitoring

**Completed:** {date}
**Time Window:** {start} — {end}
**Services:** {list}

### Health Summary
| Service | Errors | Latency | Verdict |
|---------|--------|---------|---------|
| degreed.web.next | {count} | {delta from baseline} | {OK/ISSUES} |
| degreed-coach-builder | {count} | {delta} | {OK/ISSUES} |

**Overall: {HEALTHY / ISSUES FOUND}**
**New Errors: {count}**
```

### 9. Update Jira

Post on the Epic:
```
[Agent Maestro-Monitor] Datadog Health Check Complete

Monitoring Window: {duration}
Services: degreed.web.next, degreed-coach-builder

Results:
- .NET: {count} errors, latency {delta from baseline}
- Python: {count} errors, latency {delta}
- RUM: {JS errors count, LCP}

Overall: {HEALTHY / ISSUES FOUND}

{If issues:}
New errors detected:
1. {error summary + trace link}

Datadog Dashboard: https://app.datadoghq.com/dashboard/lists
```

### 10. Present Checkpoint

> **Phase 8 Complete: Datadog Monitoring**
>
> | Service | Errors | Latency | Health |
> |---------|--------|---------|--------|
> | .NET | {count} | {delta} | {OK/ISSUES} |
> | Python | {count} | {delta} | {OK/ISSUES} |
> | RUM | {JS errors} | LCP: {s} | {OK/ISSUES} |
>
> **Overall: {HEALTHY / ISSUES FOUND}**
>
> **What would you like to do?**
> - "looks good, select approach" → Proceed to Step 9 (approach selection + cleanup)
> - "investigate {error}" → Deep dive into a specific error
> - "re-test and monitor" → Go back to Phase 7
> - "fix and redeploy" → Fix the issue, re-deploy, re-test
> - "stop" → Pipeline paused

---

## Continuous Monitoring Mode

If the user wants extended monitoring after the initial check:

```
"monitor for 30 more minutes"
```

Use a polling loop:
1. Check logs every 5 minutes
2. If new errors appear, report immediately
3. After the monitoring window, produce a final summary
4. Compare error counts: start vs end of window

## Tips

- The Datadog logs link from the deployment comment is the best starting point — it's already branch-filtered
- Always compare against Phase 1 baselines — "5 errors" is meaningless without knowing the baseline was "3 errors"
- Correlate by timestamp: when the test ran → what Datadog saw at that time
- For intermittent errors: check if they existed before the deployment (search broader time window)
- SSE and voice features are more likely to have Datadog traces showing issues — monitor those closely
