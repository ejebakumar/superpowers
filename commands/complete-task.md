# Complete Task — Verify Gate

Run the verify gate (build + lint + test) before creating or updating a PR. Auto-fix failures up to 3 times, then escalate to user.

## Arguments
- `$ARGUMENTS` — repo name(s) to verify, space-separated. Or "all" for all affected repos.

## Instructions

This is the **Verify Gate** — the pattern that makes autonomous implementation responsible. Run it before declaring any implementation phase complete.

### Verify Gate Loop

```
For each affected repo:
  1. Run: scripts/verify-gate.sh {repo}
  2. If FAIL:
     - Read the error output
     - Auto-fix the issue (lint error → fix code, test failure → fix test or code)
     - Re-run verify-gate.sh (iteration 2)
  3. If FAIL again:
     - Auto-fix again
     - Re-run verify-gate.sh (iteration 3)
  4. If STILL FAILING after 3 iterations:
     - STOP
     - Report to user: "Verify gate failed after 3 auto-fix attempts. Error: {details}"
     - Do NOT create a PR or mark the task as complete

  If PASS:
     - Commit changes
     - Push branch
     - Create PR via gh pr create
     - Run gh pr checks --watch (wait for CI)
     - If CI FAILS:
       - Fetch logs: gh run view --log-failed
       - Auto-fix, push, wait for CI (max 3 CI iterations)
       - If still failing → STOP, report to user
```

### Usage

From maestro-implementer or any implementation context:
```
/complete-task degreed-coach-builder Degreed fe-workspace
/complete-task all
```

### Rules

- NEVER mark a task as completed without running the verify gate
- NEVER create a PR without the verify gate passing
- Max 3 local auto-fix iterations + 3 CI auto-fix iterations = 6 total attempts
- Log every iteration to the build tracker under a "Verify Gate" section
- If auto-fix changes code, the fix must also pass the gate (no infinite loops)
