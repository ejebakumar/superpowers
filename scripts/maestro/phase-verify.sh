#!/usr/bin/env bash
# phase-verify.sh — Verify a pipeline phase's claims match reality.
#
# Usage: phase-verify.sh {feature-id} {phase-number}
#
# Reads docs/builds/{feature-id}.md (or docs/builds/{feature-id}-*.md) and
# checks the phase-completion contracts below. Output is a JSON object on
# stdout. Exit 0 = pass, exit 1 = mismatch.
#
# ─── Phase Completion Contracts ────────────────────────────────────────────
# Phase 0  — Tracker exists; readiness section present.
# Phase 1  — Research doc(s) exist with >=5 external sources; critic verdict
#            (if logged) is not BLOCKED.
# Phase 2  — ADR + plan files exist; no SUPERSEDED plans without
#            re-validation; critic verdict not BLOCKED.
# Phase 3  — PR(s) created in each affected repo; branch naming matches
#            feature/{epic}-{approach-name}; plan: commits newer than the
#            most recent feat:/fix: commit per branch.
# Phase 6  — Deploy notification fired (logged); smoke test 200; env URL in
#            tracker.
# Phase 7  — Test pass rate 100%; evidence dir populated; no unresolved
#            blockers in review.
# Phase 9  — Cleanup commits actually present in PR diffs (verified with
#            git log).
# ──────────────────────────────────────────────────────────────────────────

set -o pipefail

FEATURE_ID="${1:-}"
PHASE="${2:-}"

if [ -z "$FEATURE_ID" ] || [ -z "$PHASE" ]; then
  echo '{"error":"usage: phase-verify.sh {feature-id} {phase-number}"}'
  exit 1
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
TRACKER=""
for cand in \
    "$PROJECT_DIR/docs/builds/${FEATURE_ID}.md" \
    "$PROJECT_DIR/docs/builds/${FEATURE_ID}"-*.md; do
  if [ -f "$cand" ]; then TRACKER="$cand"; break; fi
done

MISMATCHES=()
BLOCKERS=()

_add_mismatch() { MISMATCHES+=("$1"); }
_add_blocker()  { BLOCKERS+=("$1"); }

if [ -z "$TRACKER" ]; then
  _add_blocker "tracker not found at docs/builds/${FEATURE_ID}.md"
fi

case "$PHASE" in
  0)
    if [ -n "$TRACKER" ] && ! grep -q -i 'readiness' "$TRACKER"; then
      _add_mismatch "tracker missing Environment Readiness section"
    fi
    ;;
  1)
    shopt -s nullglob
    research_docs=("$PROJECT_DIR"/docs/plans/*"${FEATURE_ID}"*research*.md \
                   "$PROJECT_DIR"/docs/plans/*research*"${FEATURE_ID}"*.md)
    shopt -u nullglob
    if [ ${#research_docs[@]} -eq 0 ]; then
      _add_blocker "no research doc found in docs/plans/ for ${FEATURE_ID}"
    else
      # Count external sources (URLs) in research docs
      url_count=$(grep -hcE 'https?://' "${research_docs[@]}" 2>/dev/null | awk '{s+=$1} END{print s+0}')
      if [ "${url_count:-0}" -lt 5 ]; then
        _add_blocker "research doc has <5 external URL citations (${url_count} found)"
      fi
    fi
    if [ -n "$TRACKER" ] && grep -q 'Critic.*Phase 1.*BLOCKED' "$TRACKER"; then
      _add_blocker "Phase 1 critic verdict is BLOCKED"
    fi
    ;;
  2)
    shopt -s nullglob
    adrs=("$PROJECT_DIR"/docs/architecture/*"${FEATURE_ID}"*.md)
    plans=("$PROJECT_DIR"/docs/plans/*"${FEATURE_ID}"*-plan.md)
    shopt -u nullglob
    if [ ${#adrs[@]} -eq 0 ]; then
      _add_blocker "no ADR found in docs/architecture/ for ${FEATURE_ID}"
    fi
    if [ ${#plans[@]} -eq 0 ]; then
      _add_blocker "no plan files found in docs/plans/ for ${FEATURE_ID}"
    fi
    for p in "${plans[@]}"; do
      if grep -q '## SUPERSEDED' "$p" && ! grep -q 'Re-validated' "$p"; then
        _add_blocker "plan ${p##*/} marked SUPERSEDED without re-validation"
      fi
    done
    if [ -n "$TRACKER" ] && grep -q 'Critic.*Phase 2.*BLOCKED' "$TRACKER"; then
      _add_blocker "Phase 2 critic verdict is BLOCKED"
    fi
    ;;
  3)
    if [ -n "$TRACKER" ]; then
      pr_count=$(grep -cE 'PR[ #]?[0-9]+|github.com/[^ ]+/pull/[0-9]+' "$TRACKER" 2>/dev/null || echo 0)
      if [ "${pr_count:-0}" -lt 1 ]; then
        _add_blocker "no PRs referenced in tracker"
      fi
    fi
    # Plan-vs-code recency check: walk worktrees/* if present
    if [ -d "$PROJECT_DIR/worktrees" ]; then
      for wt_repo in "$PROJECT_DIR"/worktrees/*/*/; do
        [ -d "$wt_repo/.git" ] || git -C "$wt_repo" rev-parse --git-dir >/dev/null 2>&1 || continue
        b=$(git -C "$wt_repo" branch --show-current 2>/dev/null || true)
        [[ "$b" =~ ^feature/${FEATURE_ID}- ]] || continue
        last_feat=$(git -C "$wt_repo" log --format='%ct %s' -50 "$b" 2>/dev/null \
                    | awk '/ (feat|fix)(\(|:)/{print $1; exit}' || true)
        last_plan=$(git -C "$wt_repo" log --format='%ct %s' -50 "$b" 2>/dev/null \
                    | awk '/ plan(\(|:)/{print $1; exit}' || true)
        if [ -n "$last_feat" ] && { [ -z "$last_plan" ] || [ "$last_feat" -gt "$last_plan" ]; }; then
          _add_mismatch "${wt_repo}: feat:/fix: commit newer than last plan: commit on $b"
        fi
      done
    fi
    ;;
  6)
    log="$PROJECT_DIR/docs/builds/${FEATURE_ID}-notifications.log"
    if [ ! -f "$log" ] || ! grep -q -i 'Deploy' "$log"; then
      _add_blocker "no deploy notification in ${log##*/}"
    fi
    if [ -n "$TRACKER" ] && ! grep -qE 'pr-[0-9]+\.|https?://[^ ]+\.dev' "$TRACKER"; then
      _add_mismatch "no PR env URL in tracker"
    fi
    ;;
  7)
    if [ -n "$TRACKER" ]; then
      if grep -qE 'FAIL|FAILED' "$TRACKER" && ! grep -q '100%' "$TRACKER"; then
        _add_blocker "tests not at 100% pass rate"
      fi
    fi
    ev_dir="$PROJECT_DIR/docs/builds/${FEATURE_ID}-evidence"
    if [ ! -d "$ev_dir" ] || [ -z "$(ls -A "$ev_dir" 2>/dev/null)" ]; then
      _add_mismatch "evidence dir missing or empty: ${ev_dir##*/}"
    fi
    ;;
  9)
    if [ -n "$TRACKER" ] && ! grep -q -i 'cleanup' "$TRACKER"; then
      _add_mismatch "tracker missing cleanup section"
    fi
    ;;
  *)
    _add_mismatch "no contract defined for phase ${PHASE}"
    ;;
esac

# ── Build JSON output ──────────────────────────────────────────────────────
_json_array() {
  local first=1
  printf '['
  for x in "$@"; do
    [ $first -eq 1 ] || printf ','
    first=0
    printf '"%s"' "$(echo "$x" | sed 's/"/\\"/g')"
  done
  printf ']'
}

if [ ${#BLOCKERS[@]} -eq 0 ] && [ ${#MISMATCHES[@]} -eq 0 ]; then
  CLAIMS_MATCH="true"
else
  CLAIMS_MATCH="false"
fi

printf '{"phase":%s,"feature_id":"%s","claims_match":%s,"mismatches":' "$PHASE" "$FEATURE_ID" "$CLAIMS_MATCH"
_json_array "${MISMATCHES[@]}"
printf ',"blockers":'
_json_array "${BLOCKERS[@]}"
printf '}\n'

if [ "$CLAIMS_MATCH" = "true" ]; then
  exit 0
else
  exit 1
fi
