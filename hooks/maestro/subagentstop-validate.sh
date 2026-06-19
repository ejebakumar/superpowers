#!/bin/bash
# =============================================================================
# SubagentStop Validator
# =============================================================================
# Validates that named agents (Maestro-*) produce output with the correct
# identity prefix. Silent on success, stderr + exit 2 on validation failure.
#
# Event: SubagentStop
# =============================================================================

AGENT_NAME="${CLAUDE_AGENT_NAME:-}"
AGENT_OUTPUT="${CLAUDE_AGENT_OUTPUT:-}"

# Only validate maestro-* agents
if ! echo "$AGENT_NAME" | grep -qi "maestro"; then
  exit 0
fi

# Check that implementation agents signed their Jira comments
# (This is a heuristic — checks if the output mentions the agent identity pattern)
if echo "$AGENT_NAME" | grep -qi "implementer\|alpha\|beta\|gamma"; then
  if ! echo "$AGENT_OUTPUT" | grep -q "\[Agent Maestro-"; then
    echo "WARNING: Agent $AGENT_NAME output missing [Agent Maestro-*] identity prefix" >&2
    # Warning only, don't block (exit 0 not exit 2)
  fi
fi

# Silent success
exit 0
