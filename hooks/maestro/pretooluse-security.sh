#!/bin/bash
# =============================================================================
# PreToolUse Security Blocker
# =============================================================================
# Blocks dangerous commands before they execute.
#
# Matcher: Bash
# Event: PreToolUse
# =============================================================================

TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
HOOK_INPUT="$(cat)"

pass_through() {
  [ -n "$HOOK_INPUT" ] && printf '%s\n' "$HOOK_INPUT"
  exit 0
}

block() {
  [ -n "$HOOK_INPUT" ] && printf '%s\n' "$HOOK_INPUT"
  echo "$1" >&2
  exit 2
}

if [ -n "$HOOK_INPUT" ]; then
  TOOL_NAME="$(printf '%s' "$HOOK_INPUT" | jq -r '.tool_name // ""' 2>/dev/null || printf '%s' "$TOOL_NAME")"
  TOOL_INPUT="$(printf '%s' "$HOOK_INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || printf '%s' "$TOOL_INPUT")"
fi

# Only check Bash tool calls
[[ "$TOOL_NAME" != "Bash" ]] && pass_through

# --- Dangerous command patterns ---

# Block rm -rf / or rm -rf ~
if echo "$TOOL_INPUT" | grep -qE 'rm\s+-rf\s+(/|~|\$HOME)'; then
  block "BLOCKED: rm -rf on root/home directory"
fi

# Block force push to main/master
if echo "$TOOL_INPUT" | grep -qE 'git\s+push\s+.*--force.*\s+(main|master)'; then
  block "BLOCKED: force push to main/master"
fi
if echo "$TOOL_INPUT" | grep -qE 'git\s+push\s+-f\s+.*\s+(main|master)'; then
  block "BLOCKED: force push to main/master"
fi

# Block npm publish (accidental package publishing)
if echo "$TOOL_INPUT" | grep -qE 'npm\s+publish'; then
  block "BLOCKED: npm publish (use CI for publishing)"
fi

# Block git reset --hard on main/master
if echo "$TOOL_INPUT" | grep -qE 'git\s+reset\s+--hard.*main|git\s+reset\s+--hard.*master'; then
  block "BLOCKED: git reset --hard on main/master"
fi

# Block dropping databases
if echo "$TOOL_INPUT" | grep -qiE 'DROP\s+(DATABASE|TABLE)\s'; then
  block "BLOCKED: DROP DATABASE/TABLE command"
fi

pass_through
