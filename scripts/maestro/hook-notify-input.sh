#!/usr/bin/env bash
# hook-notify-input.sh — Notification hook handler
#
# Fires when Claude is waiting for user input (permission prompt or 60s+ idle).
# Pushes a HIGH priority notification so the phone wakes you up.
#
# Silently no-ops if NTFY_TOPIC is not set or jq is missing.

set -euo pipefail

# Load env from project + global .env (shell env always wins).
# shellcheck disable=SC1091
. "$(dirname "$0")/_load-env.sh"

[ -z "${NTFY_TOPIC:-}" ] && exit 0
command -v jq >/dev/null 2>&1 || exit 0

INPUT=$(cat)
MESSAGE=$(printf '%s' "$INPUT" | jq -r '.message // "Claude is waiting for input"' 2>/dev/null || echo "Claude is waiting for input")

PROJECT=$(basename "${CLAUDE_PROJECT_DIR:-$PWD}")

"$HOME/.claude/scripts/notify.sh" \
  "Claude needs you · ${PROJECT}" \
  "$MESSAGE" \
  "high" \
  "bell" \
  > /dev/null 2>&1 &

exit 0
