#!/usr/bin/env bash
# notify.sh — Send a phone notification via Pushover or ntfy
#
# Claude can invoke this directly to send custom messages mid-task or on
# completion. Reads all secrets/config from environment variables, with a
# fallback to .env so secrets don't have to live in the shell rc.
#
# Provider selection:
#   NOTIFY_PROVIDER=pushover  → use Pushover (https://api.pushover.net)
#   NOTIFY_PROVIDER=ntfy      → use ntfy.sh
#   (unset)                   → defaults to "ntfy"
#
# Pushover env (required when NOTIFY_PROVIDER=pushover):
#   PUSHOVER_USER_KEY    — your user key (uXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)
#   PUSHOVER_APP_TOKEN   — application API token (aXXXXXXXXXXXXXXXXXXXXXXXXXXXX)
#                          create one at https://pushover.net/apps/build
#
# ntfy env (required when NOTIFY_PROVIDER=ntfy):
#   NTFY_TOPIC           — your private ntfy topic
# Optional ntfy env:
#   NTFY_SERVER          — defaults to https://ntfy.sh
#   NTFY_TOKEN           — Bearer token for auth
#
# Usage:
#   notify.sh "<title>" "<message>" [priority] [tags] [click_url]
#   priority: min | low | default | high | urgent  (default: default)
#   tags:     comma-separated short keywords       (Pushover ignores; ntfy uses)
#   click_url: optional URL the notification taps through to
#
# Examples:
#   notify.sh "Phase 3 done" "All 3 PRs merged"
#   notify.sh "Need decision" "Pick A or B" high warning
#   notify.sh "Build green" "Tests passing" low tada "https://github.com/x/y/pull/1"
#
# Exit codes:
#   0 — sent (or silently skipped when nothing is configured)
#   1 — config error (missing keys, unknown provider)
#   2 — network/server error (server returned an error response)

set -euo pipefail

# Load env from project + global .env (shell env always wins).
# shellcheck disable=SC1091
. "$(dirname "$0")/_load-env.sh"

TITLE="${1:-Claude Code}"
MESSAGE="${2:-Task update}"
PRIORITY="${3:-default}"
TAGS="${4:-robot}"
CLICK_URL="${5:-}"

# ─── Auto-tag with feature/Epic ID ──────────────────────────────────────────
# When working on multiple features in parallel, the user needs to know which
# feature each notification is for. Resolve the feature ID from (in order):
#   1. CLAUDE_FEATURE_ID env var (set by the conductor at pipeline start)
#   2. Title already includes a [TAG] prefix (caller did it manually) → no-op
#   3. Current git branch matching feature/{EPIC-ID}-... or fix/{ID}-... → extract
# Then prepend [FEATURE-ID] to the title so every notification is tagged.

_resolve_feature_id() {
  if [ -n "${CLAUDE_FEATURE_ID:-}" ]; then
    echo "$CLAUDE_FEATURE_ID"
    return
  fi
  # Try to parse from git branch in CLAUDE_PROJECT_DIR
  local pdir="${CLAUDE_PROJECT_DIR:-$PWD}"
  if [ -d "$pdir/.git" ] || git -C "$pdir" rev-parse --git-dir >/dev/null 2>&1; then
    local branch
    branch=$(git -C "$pdir" branch --show-current 2>/dev/null || true)
    # Match feature/AIDATASCI-1234-... or feature/PD-1234-... or fix/{ID}-...
    if [[ "$branch" =~ ^(feature|fix|feat|bug)/([A-Z]+-[0-9]+) ]]; then
      echo "${BASH_REMATCH[2]}"
      return
    fi
  fi
  echo ""
}

# Only auto-prefix if the title doesn't already start with [SOMETHING]
if [[ ! "$TITLE" =~ ^\[ ]]; then
  FEATURE_ID=$(_resolve_feature_id)
  if [ -n "$FEATURE_ID" ]; then
    TITLE="[${FEATURE_ID}] - ${TITLE}"
  fi
fi
unset -f _resolve_feature_id

# ─── Pushover backend ───────────────────────────────────────────────────────

send_pushover() {
  if [ -z "${PUSHOVER_USER_KEY:-}" ] || [ -z "${PUSHOVER_APP_TOKEN:-}" ]; then
    cat >&2 <<'EOF'
{"sent":false,"provider":"pushover","reason":"missing_keys","help":"Set PUSHOVER_USER_KEY and PUSHOVER_APP_TOKEN in .env. Get an App Token at https://pushover.net/apps/build (sign in → Apps & Plugins → Create New Application → copy API Token/Key)."}
EOF
    return 1
  fi

  # Map priority NAME to Pushover numeric scale (-2..2)
  local p_num
  case "$PRIORITY" in
    min)     p_num=-2 ;;
    low)     p_num=-1 ;;
    default) p_num=0 ;;
    high)    p_num=1 ;;
    urgent)  p_num=2 ;;
    -2|-1|0|1|2) p_num="$PRIORITY" ;;
    *)       p_num=0 ;;
  esac

  local curl_args=(
    -sS --max-time 10
    -F "token=${PUSHOVER_APP_TOKEN}"
    -F "user=${PUSHOVER_USER_KEY}"
    -F "title=${TITLE}"
    -F "message=${MESSAGE}"
    -F "priority=${p_num}"
  )

  # Emergency priority requires retry + expire
  if [ "$p_num" = "2" ]; then
    curl_args+=(-F "retry=30" -F "expire=3600")
  fi

  if [ -n "$CLICK_URL" ]; then
    curl_args+=(-F "url=${CLICK_URL}" -F "url_title=Open")
  fi

  local response http_code body
  if ! response=$(curl "${curl_args[@]}" -w $'\n%{http_code}' "https://api.pushover.net/1/messages.json" 2>/dev/null); then
    echo '{"sent":false,"provider":"pushover","reason":"network_error"}' >&2
    return 2
  fi

  http_code="${response##*$'\n'}"
  body="${response%$'\n'*}"

  if [ "$http_code" = "200" ] && echo "$body" | grep -q '"status":1'; then
    echo "{\"sent\":true,\"provider\":\"pushover\",\"title\":\"${TITLE}\",\"priority\":${p_num}}"
    return 0
  fi

  echo "{\"sent\":false,\"provider\":\"pushover\",\"http\":${http_code},\"response\":${body}}" >&2
  return 2
}

# ─── ntfy backend ───────────────────────────────────────────────────────────

send_ntfy() {
  if [ -z "${NTFY_TOPIC:-}" ]; then
    echo '{"sent":false,"provider":"ntfy","reason":"NTFY_TOPIC not set"}'
    return 0
  fi

  local server url
  server="${NTFY_SERVER:-https://ntfy.sh}"
  url="${server%/}/${NTFY_TOPIC}"

  local curl_args=(
    -fsS --max-time 10
    -H "Title: ${TITLE}"
    -H "Priority: ${PRIORITY}"
    -H "Tags: ${TAGS}"
  )

  [ -n "$CLICK_URL" ] && curl_args+=(-H "Click: ${CLICK_URL}")
  [ -n "${NTFY_TOKEN:-}" ] && curl_args+=(-H "Authorization: Bearer ${NTFY_TOKEN}")

  if curl "${curl_args[@]}" -d "${MESSAGE}" "${url}" > /dev/null 2>&1; then
    echo "{\"sent\":true,\"provider\":\"ntfy\",\"title\":\"${TITLE}\"}"
    return 0
  else
    echo "{\"sent\":false,\"provider\":\"ntfy\",\"reason\":\"network_or_server_error\"}" >&2
    return 2
  fi
}

# ─── Dispatch ───────────────────────────────────────────────────────────────

PROVIDER="${NOTIFY_PROVIDER:-pushover}"

# ── Local notification log (always written on success) ────────────────────
# Append a line to docs/builds/{FEATURE-ID}-notifications.log so the user can
# audit every notification fired during a pipeline run. Never blocks/fails.
_log_notification() {
  local pdir="${CLAUDE_PROJECT_DIR:-$PWD}"
  local log_dir="$pdir/docs/builds"
  mkdir -p "$log_dir" 2>/dev/null || true
  local fid=""
  if [ -n "${CLAUDE_FEATURE_ID:-}" ]; then
    fid="$CLAUDE_FEATURE_ID"
  elif git -C "$pdir" rev-parse --git-dir >/dev/null 2>&1; then
    local b
    b=$(git -C "$pdir" branch --show-current 2>/dev/null || true)
    if [[ "$b" =~ ^(feature|fix|feat|bug)/([A-Z]+-[0-9]+) ]]; then
      fid="${BASH_REMATCH[2]}"
    fi
  fi
  local log_file
  if [ -n "$fid" ]; then
    log_file="$log_dir/${fid}-notifications.log"
  else
    log_file="$log_dir/_notifications_unknown.log"
  fi
  local ts body_excerpt
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  body_excerpt="${MESSAGE:0:100}"
  printf '%s | priority=%s | title=%s | body-first-100=%s\n' \
    "$ts" "$PRIORITY" "$TITLE" "$body_excerpt" >> "$log_file" 2>/dev/null || true
}

case "$PROVIDER" in
  pushover)
    if send_pushover; then _log_notification || true; fi
    ;;
  ntfy)
    if send_ntfy; then _log_notification || true; fi
    ;;
  *)
    echo "{\"sent\":false,\"reason\":\"unknown NOTIFY_PROVIDER: ${PROVIDER}\"}" >&2
    exit 1
    ;;
esac
