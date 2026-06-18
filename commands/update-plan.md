# Update Plan

Amend the active implementation plan file to reflect a change in direction (user redirect, blocker discovery, scope tweak). This is the **only** sanctioned way to change what's being built mid-implementation — direct code-without-plan-update is forbidden by the Plan Adherence Contract.

## Arguments

- `$ARGUMENTS` — free-form description of what's changing.
  - Examples: `use middleware instead of decorator on Step 6`, `drop Step 9 — research showed it's redundant`, `add a new step for cache invalidation between Steps 4 and 5`

## What This Command Does

1. **Locate the active plan file** — typically `docs/plans/{EPIC-ID}-{approach-short-name}-plan.md`. Read it from the build tracker if you don't know which approach is active.

2. **Identify the affected step(s)** based on `$ARGUMENTS`. Read the relevant section of the plan.

3. **Acquire the plan-amend lock** (the `pretool-plan-discipline` hook blocks direct plan edits without it):
   ```bash
   mkdir -p .claude && touch .claude/.plan-amend.lock
   ```

4. **Edit the plan file with the amendment:**
   - Update the relevant Step section (signatures, files, test cases) to reflect the new direction
   - Update the **Amendments Log** with a new row: `{date} | Step {N} | {change} | {reason}`
   - Update **Current State** if the change affects what's currently in flight
   - If the amendment is large enough to invalidate Step ordering, reorder the steps

5. **Commit the plan amendment** (separate commit, BEFORE any code change):
   ```bash
   git add docs/plans/{plan-file}.md
   git commit -m "plan: {short summary of amendment} (amends Step {N})"
   ```
   The commit must be a **plan-only** commit. Code changes implementing the amendment go in a separate follow-up commit.

6. **Release the plan-amend lock:**
   ```bash
   rm -f .claude/.plan-amend.lock
   ```

7. **Re-read the amended plan section** so subsequent code changes follow the new plan.

8. **Report back to the user:** confirm what was amended, which file/section changed, the commit SHA, and what's next.

## Decision Rules

- If `$ARGUMENTS` is **adding a new step**, insert it in the right ordering position; renumber subsequent steps if needed
- If `$ARGUMENTS` is **dropping a step**, mark it as `~~Step N (REMOVED)~~` rather than deleting (preserves history) and add to Amendments Log with reason
- If `$ARGUMENTS` is **modifying a step**, update inline; preserve old signatures in a comment if non-trivial: `// was: {old}` so reviewers can see the change
- If `$ARGUMENTS` is **out-of-scope** for the current plan (different feature entirely), refuse and tell the user to start a new plan

## When to Use

- User says "actually do X instead of Y" → `/update-plan` THEN implement X
- Implementer hits a blocker that requires deviating from plan → `/update-plan` to record the workaround THEN proceed
- Research-during-implementation reveals a better pattern → `/update-plan` to capture, then refactor
- Critic flags drift → `/update-plan` to either ratify the drift (if intentional) or revert the code (if accidental)

## When NOT to Use

- Trivial tweaks within an existing function that don't change the plan's described shape (variable rename, comment fix)
- Test refactors that don't change what's tested
- Bug fixes within a step that's already in the plan (just fix and proceed)

## Constraints

- The plan file is the source of truth. If `/update-plan` and the code disagree, the plan is right and the code must be updated to match (or the plan amended again to match the code, with explicit reason).
- Plan amendments are commits — they show up in `git log docs/plans/` so the history of "what was supposed to be built" is preserved separately from "what was built."
- After running this command, the implementer agent is expected to re-read the amended section before continuing work.

## Example Outputs

**User:** `/update-plan use Apollo apo-data-table instead of custom table component for Step 7`

**Action taken:**
1. Read `docs/plans/PD-1234-strategy-pattern-plan.md`
2. Found Step 7 (frontend table component) — was custom `<feature-table>` component
3. Edited Step 7's "Files" and "Additions" to use `<apo-data-table>` from `libs/apollo/`
4. Added Amendments Log row: `2026-05-03 | Step 7 | Switched to apo-data-table | User: Apollo equivalent exists, avoid duplication`
5. Committed: `plan: use apo-data-table for Step 7 (avoid Apollo gap)` → SHA `abc1234`
6. Reported: "Plan amended. Step 7 now uses apo-data-table. Ready to implement."
