#!/usr/bin/env bash
# hook-notify-stop.sh — Stop hook handler
#
# Fires when a Claude session ends. Reads the transcript from the JSON event
# on stdin, extracts Claude's last user-facing message, and pushes it to the
# phone. This auto-captures Claude's actual final message — no hardcoded text.
#
# Silently no-ops if NTFY_TOPIC is not set or jq is missing, so users without
# the notification setup never see hook failures.

set -euo pipefail

# Load env from project + global .env (shell env always wins).
# shellcheck disable=SC1091
. "$(dirname "$0")/_load-env.sh"

# Bail silently if not configured — never break a Claude session
[ -z "${NTFY_TOPIC:-}" ] && exit 0
command -v jq >/dev/null 2>&1 || exit 0

INPUT=$(cat)
TRANSCRIPT=$(printf '%s' "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null || true)

# Default fallback message
LAST_MSG="Task complete — check terminal"

if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  # Transcript is JSONL; grab the last assistant text message
  EXTRACTED=$(grep '"role":"assistant"' "$TRANSCRIPT" 2>/dev/null \
    | tail -1 \
    | jq -r '.message.content[]? | select(.type=="text") | .text' 2>/dev/null \
    | tr '\n' ' ' \
    | head -c 400 || true)
  [ -n "$EXTRACTED" ] && LAST_MSG="$EXTRACTED"
fi

PROJECT=$(basename "${CLAUDE_PROJECT_DIR:-$PWD}")

# Fire-and-forget — don't block session shutdown if ntfy is slow
"$HOME/.claude/scripts/notify.sh" \
  "Claude · ${PROJECT}" \
  "$LAST_MSG" \
  "default" \
  "white_check_mark" \
  > /dev/null 2>&1 &

exit 0
