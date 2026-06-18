# Onboard

Walk me through first-time setup of this workspace, OR re-run a specific phase of onboarding.

## Arguments

- `$ARGUMENTS` — optional flag controlling behavior:
  - (empty) → resume from last incomplete phase, or start at Phase 0 if fresh
  - `--verify` → re-run Phase 6 (10-step verification gauntlet) only
  - `--redo phase {N}` → re-run a specific phase
  - `--tour` → jump straight to Phase 7 (pipeline tour summary)

## Behavior

Load the `onboarding` skill. The skill is the source of truth — its 7-phase walkthrough handles everything: prereq detection, sub-repo cloning, plugin install, secrets via `$EDITOR`, MCP auth, verification gauntlet, and a brief pipeline tour.

State is tracked in `.claude/setup-progress.json` (gitignored), so re-invocation resumes from where the user left off.

## Examples

```
/onboard                           # resume or start fresh
/onboard --verify                  # just re-run the 10-step gauntlet
/onboard --redo phase 4            # rotate Pushover keys, re-run secrets phase
/onboard --tour                    # refresher tour, skip everything else
```

## When to Use

- First time using this workspace after cloning it
- After a system update broke something (re-verify)
- After rotating secrets (re-run Phase 4)
- When you want a quick refresher of the pipeline (use `--tour`)
