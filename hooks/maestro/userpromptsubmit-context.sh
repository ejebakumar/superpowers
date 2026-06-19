#!/bin/bash
# =============================================================================
# UserPromptSubmit Git Context Enricher
# =============================================================================
# Injects git branch + dirty file count via hookSpecificOutput JSON format.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Plugin layout: hooks/maestro/<script> → workspace root is three levels up
# (hooks/maestro → hooks → plugin root → workspace dir holding the sibling repos).
WS="$(cd "$SCRIPT_DIR/../../.." && pwd)"

context=""

for repo in degreed-coach-builder Degreed fe-workspace degreed-flutter degreed-assistant; do
  repo_path="$WS/$repo"
  if [ -d "$repo_path/.git" ]; then
    branch=$(cd "$repo_path" && git branch --show-current 2>/dev/null)
    dirty=$(cd "$repo_path" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$dirty" -gt 0 ]; then
      context="$context $repo:$branch(${dirty}dirty)"
    fi
  fi
done

if [ -n "$context" ]; then
  escaped=$(echo "$context" | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"UserPromptSubmit\",\"additionalContext\":\"Git:${escaped}\"}}"
fi

exit 0
