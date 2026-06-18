# Notify

Send a phone notification through the project's notification system (`.claude/scripts/notify.sh`). Use mid-task to ping the user with a milestone, blocker, or FYI when they're not watching the terminal.

## Arguments

- `$ARGUMENTS` — free-form description of what to send. Optional.
  - With text: use it as the message; pick a sensible title and priority from context.
  - Empty: summarize the current task state and ping with that summary.

## Decision Rules

Pick **priority** based on context:

| Context | Priority | When |
|---|---|---|
| Blocking question, decision needed, broken state | `high` | "Need decision", "Build failed", "Stuck on X" |
| Phase complete, milestone reached, deploy done | `default` | "Phase 3 done", "Tests pass", "PR merged" |
| Background FYI, non-urgent update | `low` | "Long-running task started", "Reminder X" |
| Production incident, urgent attention | `urgent` | Real emergencies only — beware notification fatigue |

Pick a **title** that's 5-7 words and action-oriented (e.g., "Phase 3 complete", "Tests failing on PR", "Need decision on approach").

Pick **tags** from common keywords:
- `tada` (🎉) — celebrations, completions
- `rocket` (🚀) — launches, deploys
- `warning` (⚠️) — issues found, near-fail
- `bug` (🐛) — bug found
- `bell` (🔔) — attention needed
- `white_check_mark` (✅) — tests pass, verifications
- `robot` (🤖) — generic Claude action

If a relevant URL exists (PR link, dashboard, Jira ticket), include it as the click-through.

## Implementation

1. Decide title (concise, action-oriented)
2. Decide message body (1-2 sentences, specific)
3. Decide priority based on the rules above
4. Decide tag (or default to `robot`)
5. Decide click URL (PR / Jira / dashboard, if relevant)
6. Execute:
   ```bash
   .claude/scripts/notify.sh "<title>" "<message>" <priority> <tag> "<click_url>"
   ```
7. Report the JSON response from the script back to the user

## Examples

**User:** `/notify Phase 3 implementation done, all 3 PRs created`
**Action:**
```bash
.claude/scripts/notify.sh "Phase 3 complete" "All 3 worktree implementations done — PRs ready for review" default rocket
```

**User:** `/notify need decision on which approach to merge`
**Action:**
```bash
.claude/scripts/notify.sh "Decision needed" "Pick which approach to merge — strategy-pattern, langgraph-agent, or middleware-hook" high warning
```

**User:** `/notify` (no args, mid-task)
**Action:** Summarize current state + ping. Example:
```bash
.claude/scripts/notify.sh "Pipeline at Phase 4" "SDD draft on Confluence; awaiting your review before publishing" default robot
```

## Constraints

- Do NOT call this for trivial confirmations (file saved, single command done)
- Do NOT call this in tight loops or after every minor step
- The `Stop` hook auto-fires at session end with Claude's last message as a backstop, so this is for proactive mid-task pings
- Returns silently `{"sent":false,...}` if Pushover credentials are missing — that's a configuration issue, not a script bug
