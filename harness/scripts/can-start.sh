#!/usr/bin/env bash
set -euo pipefail

# Deterministic startability check for harness issues.
# Usage: can-start.sh <issue-number>
# Exit 0 = STARTABLE (all blockers closed or none listed)
# Exit 1 = BLOCKED   (at least one open blocker)
# Exit 2 = ERROR     (gh call failed or bad usage)

usage() {
  echo "Usage: $(basename "$0") <issue-number>" >&2
  exit 2
}

[[ $# -eq 1 ]] || usage
[[ "$1" =~ ^[0-9]+$ ]] || { echo "ERROR: issue number must be a positive integer, got: $1" >&2; exit 2; }

ISSUE_NUMBER="$1"

# Auto-detect repo from the origin remote URL so the script targets the fork,
# not whatever gh considers the default repo (which follows branch tracking).
# Handles both https://github.com/OWNER/REPO.git and git@github.com:OWNER/REPO.git.
ORIGIN_URL=$(git remote get-url origin 2>/dev/null) || {
  echo "ERROR: no 'origin' remote found" >&2
  exit 2
}
REPO=$(echo "$ORIGIN_URL" | grep -oE '[^/:]+/[^/]+$' | sed 's/\.git$//') || {
  echo "ERROR: could not parse repo from origin remote: $ORIGIN_URL" >&2
  exit 2
}

# Fetch the issue body.
BODY=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json body --jq '.body' 2>/dev/null) || {
  echo "ERROR: could not fetch issue #${ISSUE_NUMBER} from ${REPO}" >&2
  exit 2
}

# Extract lines between "## Blocked by" and the next "##" heading.
BLOCKED_SECTION=$(echo "$BODY" | awk '
  /^## Blocked by/ { in_section=1; next }
  in_section && /^## / { exit }
  in_section { print }
')

# Extract all #N references from that section only.
# grep exits 1 when no matches; || true prevents set -e from aborting the script.
BLOCKER_NUMS=$(echo "$BLOCKED_SECTION" | grep -oE '#[0-9]+' | tr -d '#' | sort -un || true)

if [[ -z "$BLOCKER_NUMS" ]]; then
  echo "STARTABLE: issue #${ISSUE_NUMBER} has no blockers listed"
  exit 0
fi

# Query each blocker and build the result table.
BLOCKED_COUNT=0
TABLE_ROWS=()

while IFS= read -r num; do
  BLOCKER_JSON=$(gh issue view "$num" --repo "$REPO" --json title,state 2>/dev/null) || {
    TABLE_ROWS+=("$(printf "%-6s %-50s %s" "#${num}" "(not found)" "UNKNOWN")")
    BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
    continue
  }

  TITLE=$(echo "$BLOCKER_JSON" | jq -r '.title')
  STATE=$(echo "$BLOCKER_JSON" | jq -r '.state')

  # gh returns "OPEN" or "CLOSED" (uppercase).
  if [[ "$STATE" == "OPEN" ]]; then
    BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
  fi

  TABLE_ROWS+=("$(printf "%-6s %-50s %s" "#${num}" "${TITLE:0:50}" "$STATE")")
done <<< "$BLOCKER_NUMS"

if [[ "$BLOCKED_COUNT" -gt 0 ]]; then
  printf "%-6s %-50s %s\n" "ISSUE" "TITLE" "STATE"
  printf "%-6s %-50s %s\n" "------" "--------------------------------------------------" "------"
  for row in "${TABLE_ROWS[@]}"; do
    echo "$row"
  done
  echo ""
  echo "BLOCKED: ${BLOCKED_COUNT} open blocker(s) for issue #${ISSUE_NUMBER}"
  exit 1
else
  echo "STARTABLE: issue #${ISSUE_NUMBER} — all blockers are closed"
  exit 0
fi
