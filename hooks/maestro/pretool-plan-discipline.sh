#!/usr/bin/env bash
# pretool-plan-discipline.sh — PreToolUse hook enforcing plan discipline.
#
# Fires on Edit / Write / MultiEdit. Reads $CLAUDE_TOOL_INPUT (JSON) and:
#   1. BLOCKS direct edits to docs/plans/*-plan.md files (unless invoked from
#      the update-plan skill).
#   2. WARNS when a worktree edit happens after a feat:/fix: commit but no
#      newer plan: commit (i.e. likely undocumented drift).
#
# Output follows the Claude Code PreToolUse contract:
#   allow — echo the original hook JSON to stdout and exit 0
#   block — echo the original hook JSON to stdout, write reason to stderr, exit 2
#
# Fail-open: if jq is missing or input is unparseable, exit 0 with a warning.

set -uo pipefail

HOOK_INPUT="$(cat)"
INPUT="${CLAUDE_TOOL_INPUT:-}"

pass_through() {
  [ -n "$HOOK_INPUT" ] && printf '%s\n' "$HOOK_INPUT"
  exit 0
}

block() {
  local reason="$1"
  [ -n "$HOOK_INPUT" ] && printf '%s\n' "$HOOK_INPUT"
  echo "$reason" >&2
  exit 2
}

# Fail-open if jq is missing.
if ! command -v jq >/dev/null 2>&1; then
  echo "pretool-plan-discipline: jq not installed — skipping plan-discipline checks" >&2
  pass_through
fi

if [ -n "$HOOK_INPUT" ]; then
  INPUT="$HOOK_INPUT"
fi

# Fail-open if input is empty.
if [ -z "$INPUT" ]; then
  pass_through
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // .file_path // .path // empty' 2>/dev/null || true)
if [ -z "$FILE_PATH" ]; then
  # MultiEdit may put the path elsewhere; fail-open.
  pass_through
fi

# Marker-file pattern: /update-plan command creates this lock before editing.
# Claude Code does not export a reliable CLAUDE_SKILL_NAME env var, so we use
# a filesystem signal instead. The /update-plan command writes the lock,
# then removes it after the plan-only commit.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PLAN_AMEND_LOCK="$PROJECT_DIR/.claude/.plan-amend.lock"

# ── Rule 1: Block direct edits to plan files ───────────────────────────────
case "$FILE_PATH" in
  *docs/plans/*-plan.md|*/docs/plans/*-plan.md)
    if [ ! -f "$PLAN_AMEND_LOCK" ]; then
      block "$(cat <<EOF
Direct edits to plan files are forbidden.
File: $FILE_PATH
Use the /update-plan slash command to amend the plan. The command will create
$PLAN_AMEND_LOCK to authorize the edit, commit the plan-only change, then
remove the lock. Plan amendments must precede any code changes per the Plan
Adherence Contract.
EOF
)"
    fi
    ;;
esac

# ── Rule 2: Warn on worktree code edit without fresh plan amendment ────────
# Matches paths under any worktrees/{name}/{repo}/...
if [[ "$FILE_PATH" =~ /worktrees/([^/]+)/([^/]+)/ ]]; then
  WORKTREE_PATH=$(echo "$FILE_PATH" | sed -E 's|(.*/worktrees/[^/]+/[^/]+)/.*|\1|')
  if [ -d "$WORKTREE_PATH/.git" ] || git -C "$WORKTREE_PATH" rev-parse --git-dir >/dev/null 2>&1; then
    BRANCH=$(git -C "$WORKTREE_PATH" branch --show-current 2>/dev/null || true)
    if [ -n "$BRANCH" ]; then
      LAST_FEAT=$(git -C "$WORKTREE_PATH" log --format='%ct %s' -50 "$BRANCH" 2>/dev/null \
                  | awk '/ (feat|fix)(\(|:)/{print $1; exit}' || true)
      LAST_PLAN=$(git -C "$WORKTREE_PATH" log --format='%ct %s' -50 "$BRANCH" 2>/dev/null \
                  | awk '/ plan(\(|:)/{print $1; exit}' || true)
      if [ -n "$LAST_FEAT" ] && { [ -z "$LAST_PLAN" ] || [ "$LAST_FEAT" -gt "$LAST_PLAN" ]; }; then
        cat >&2 <<EOF
WARNING: Code edit in $WORKTREE_PATH (branch: $BRANCH) without a fresh plan amendment.
Last feat:/fix: commit is newer than the last plan: commit.
If this edit is a deviation from the plan, run /update-plan FIRST.
EOF
      fi
    fi
  fi
fi

pass_through
