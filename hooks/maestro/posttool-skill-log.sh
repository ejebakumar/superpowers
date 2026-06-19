#!/usr/bin/env bash
# posttool-skill-log.sh — PostToolUse hook that logs every Skill invocation.
#
# Triggers on the Skill tool. Appends one line to a per-feature skills log so
# the conductor (and the user) can audit which skills ran during each feature.
#
# Always exits 0 — observability never blocks.

set -uo pipefail

INPUT="${CLAUDE_TOOL_INPUT:-}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"

SKILL_NAME="unknown"
if command -v jq >/dev/null 2>&1 && [ -n "$INPUT" ]; then
  SKILL_NAME=$(echo "$INPUT" | jq -r '.skill // .name // "unknown"' 2>/dev/null || echo "unknown")
fi

# ── Resolve feature ID (mirrors notify.sh logic) ───────────────────────────
FEATURE_ID=""
if [ -n "${CLAUDE_FEATURE_ID:-}" ]; then
  FEATURE_ID="$CLAUDE_FEATURE_ID"
else
  if git -C "$PROJECT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
    BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || true)
    if [[ "$BRANCH" =~ ^(feature|fix|feat|bug)/([A-Z]+-[0-9]+) ]]; then
      FEATURE_ID="${BASH_REMATCH[2]}"
    fi
  fi
fi

BRANCH="${BRANCH:-$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo unknown)}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

LOG_DIR="$PROJECT_DIR/docs/builds"
mkdir -p "$LOG_DIR" 2>/dev/null || true

if [ -n "$FEATURE_ID" ]; then
  LOG_FILE="$LOG_DIR/${FEATURE_ID}-skills.log"
else
  LOG_FILE="$LOG_DIR/_skills_log.md"
fi

printf '%s | %s | branch=%s | cwd=%s\n' \
  "$TIMESTAMP" "$SKILL_NAME" "$BRANCH" "$PWD" >> "$LOG_FILE" 2>/dev/null || true

exit 0
