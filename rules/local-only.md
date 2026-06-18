# Local-Only Mode

Rules for builds that must NOT touch any external system (Jira, Confluence, GitHub, Slack, deployment pipelines).

**When this applies.** Any time the user invokes the build platform in local-only mode — typically signalled by an explicit instruction like *"local only"*, *"don't push"*, *"no Jira"*, or work scoped to a personal/experimental branch. When in doubt, ask before acting.

This file is the **explicit override** for the otherwise-default behaviours in `feature-pipeline.md`. In local-only mode, the rules below take precedence.

---

## Hard prohibitions (NEVER, no override)

1. **NEVER** call `mcp__atlassian__*` write tools — no `addCommentToJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `createJiraIssue`, `addWorklogToJiraIssue`, `createConfluencePage`, `updateConfluencePage`, `createConfluenceFooterComment`, `createConfluenceInlineComment`. Read calls are also avoided unless the user explicitly asks for context lookup.
2. **NEVER** call `mcp__plugin_slack_slack__*` or `mcp__slack__*` send/post tools. No `slack:draft-announcement`, no `slack:standup` posts, no DMs. Drafts saved to `/tmp/*.md` only.
3. **NEVER** run write `gh` commands: `gh pr create`, `gh pr comment`, `gh pr edit`, `gh pr merge`, `gh issue comment`, `gh issue create`, `gh issue edit`, `gh release create`, `gh api -X POST`, `gh api -X PATCH`, `gh api -X DELETE`. Read-only `gh` is fine (`gh pr view`, `gh issue list`).
4. **NEVER** run `git push`, `git push --force`, `git push --tags`, or any remote-bearing `git` operation. `git fetch` and `git pull` are fine.
5. **NEVER** run `/deploy-feature`, `/notify`, or any command that posts to an external system.

## Required behaviours (ALWAYS)

6. **ALWAYS** commit locally with a `Co-Authored-By: Claude <noreply@anthropic.com>` trailer when Claude generated material code (so future Code Health attribution detection picks it up).
7. **ALWAYS** keep work on a local branch. New branch name pattern: `local/<feature-slug>` (e.g., `local/code-health-section`).
8. **ALWAYS** route documentation outputs to a `docs/` directory inside the target repo, not Confluence. The `maestro-doc` agent must write Markdown files locally; it must NOT call `createConfluencePage`.
9. **ALWAYS** route test outputs to local Postgres / local Next.js / local Docker only. `localhost:5432`, `localhost:3000`, `localhost:8000` are the canonical local endpoints.

## Pipeline overrides

The default `feature-pipeline.md` has rules like *"Always post to Jira when a phase completes"* and *"Confluence writes go to ONE space only"*. In local-only mode those are **disabled**. Specifically:

- **Checkpoints between phases:** still required, still must stop and wait. But the deliverable presented at each checkpoint is local artefacts (files, diff summary, command output), not a Jira link.
- **No Jira ticket binding:** the pipeline is invoked from a local plan file (in `~/.claude/plans/`), not a Jira Epic. The conductor must not search for or create a Jira ticket.
- **Worktree creation:** still mandatory for parallel multi-approach work. Worktrees stay local; no `git push` of them.
- **maestro-doc:** writes to `<repo>/docs/<feature-slug>/README.md` instead of creating a Confluence page.
- **maestro-conductor:** suppresses the "post to Jira" step; the phase-complete event is logged locally to the plan file or to a build log under `/tmp/build-<feature-slug>.log`.

## Verification before any external-looking action

Before executing any tool call that could touch an external system, the agent MUST verify:

- Is the tool one of the prohibited list above? → REFUSE.
- Is the command a `git push` or variant? → REFUSE.
- Is the URL being POSTed to outside `localhost`? → REFUSE.

If unsure, ask the user. A 5-second pause to confirm is always cheaper than an unwanted external write.

## Memory alignment

This rule file aligns with the user-level memory note `feedback_personal_projects_local_only.md`:

> Personal projects stay 100% local; no git push/PR/Jira/Confluence/Slack writes, no CI/CD.

If a user instruction appears to conflict with local-only mode (e.g., "go ahead and post the rollout note"), STOP and ask for explicit confirmation that local-only mode is being lifted for that specific action.
