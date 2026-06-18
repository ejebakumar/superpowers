#!/bin/bash
# =============================================================================
# PreToolUse Security Blocker
# =============================================================================
# Blocks dangerous commands before they execute. Silent on success (no stdout),
# stderr + exit 2 on block. This is the "silent success" pattern.
#
# Matcher: Bash
# Event: PreToolUse
# =============================================================================

TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"

# Only check Bash tool calls
[[ "$TOOL_NAME" != "Bash" ]] && exit 0

# --- Dangerous command patterns ---

# Block rm -rf / or rm -rf ~
if echo "$TOOL_INPUT" | grep -qE 'rm\s+-rf\s+(/|~|\$HOME)'; then
  echo "BLOCKED: rm -rf on root/home directory" >&2
  exit 2
fi

# Block force push to main/master
if echo "$TOOL_INPUT" | grep -qE 'git\s+push\s+.*--force.*\s+(main|master)'; then
  echo "BLOCKED: force push to main/master" >&2
  exit 2
fi
if echo "$TOOL_INPUT" | grep -qE 'git\s+push\s+-f\s+.*\s+(main|master)'; then
  echo "BLOCKED: force push to main/master" >&2
  exit 2
fi

# Block npm publish (accidental package publishing)
if echo "$TOOL_INPUT" | grep -qE 'npm\s+publish'; then
  echo "BLOCKED: npm publish (use CI for publishing)" >&2
  exit 2
fi

# Block git reset --hard on main/master
if echo "$TOOL_INPUT" | grep -qE 'git\s+reset\s+--hard.*main|git\s+reset\s+--hard.*master'; then
  echo "BLOCKED: git reset --hard on main/master" >&2
  exit 2
fi

# Block dropping databases
if echo "$TOOL_INPUT" | grep -qiE 'DROP\s+(DATABASE|TABLE)\s'; then
  echo "BLOCKED: DROP DATABASE/TABLE command" >&2
  exit 2
fi

# Silent success — no output
exit 0
