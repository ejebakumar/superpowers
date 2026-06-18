# Shared env loader — sourced by notify.sh, hook-notify-stop.sh,
# hook-notify-input.sh.
#
# Precedence (highest first):
#   1. Shell environment (anything already exported wins)
#   2. $CLAUDE_PROJECT_DIR/.env  (project-local — preferred)
#   3. ~/.claude/.env            (global fallback)
#
# Override: set CLAUDE_NOTIFY_ENV_FILE to a path to skip the search and load
# only that file.
#
# This file is meant to be SOURCED, not executed.

_notify_load_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  local line key val
  while IFS= read -r line || [ -n "${line:-}" ]; do
    case "$line" in
      ''|\#*) continue ;;
      *=*)
        key="${line%%=*}"
        key="${key#export }"
        # only set if not already in env (preserves shell env priority)
        if [ -z "${!key:-}" ]; then
          val="${line#*=}"
          val="${val%\"}"; val="${val#\"}"
          val="${val%\'}"; val="${val#\'}"
          export "$key=$val"
        fi
        ;;
    esac
  done < "$file"
}

if [ -n "${CLAUDE_NOTIFY_ENV_FILE:-}" ]; then
  _notify_load_env_file "$CLAUDE_NOTIFY_ENV_FILE"
else
  # Auto-detect project dir from this loader's path if CLAUDE_PROJECT_DIR is unset.
  # Script lives at <project>/.claude/scripts/_load-env.sh — grandparent-of-grandparent is project root.
  # Resolves the case where notify.sh is invoked outside a Claude Code session (CLAUDE_PROJECT_DIR not exported).
  if [ -z "${CLAUDE_PROJECT_DIR:-}" ]; then
    # BASH_SOURCE works when this file is sourced; falls back to $0 if not bash.
    _notify_loader_path="${BASH_SOURCE[0]:-$0}"
    if [ -n "$_notify_loader_path" ] && [ -f "$_notify_loader_path" ]; then
      _notify_loader_dir="$(cd "$(dirname "$_notify_loader_path")" 2>/dev/null && pwd)"
      if [ -n "$_notify_loader_dir" ]; then
        # _notify_loader_dir = <project>/.claude/scripts → strip two levels for project root
        CLAUDE_PROJECT_DIR="$(cd "$_notify_loader_dir/../.." 2>/dev/null && pwd)"
        export CLAUDE_PROJECT_DIR
      fi
    fi
    unset _notify_loader_path _notify_loader_dir
  fi
  # Project .env first (takes precedence due to "shell wins" semantics)
  [ -n "${CLAUDE_PROJECT_DIR:-}" ] && _notify_load_env_file "$CLAUDE_PROJECT_DIR/.env"
  # Global fallback
  _notify_load_env_file "$HOME/.claude/.env"
fi

unset -f _notify_load_env_file
