#!/bin/bash

set -eo pipefail

# --- Configuration ---
# Max lines changed (added + deleted) allowed per file for it to be considered low-risk.
MAX_LINES_CHANGED=10
# Base branch to compare against
BASE_BRANCH="origin/main"
# Platform owner patterns (taken from .github/CODEOWNERS)
# Add all relevant patterns here. Needs careful mapping from CODEOWNERS.
# Example:
PLATFORM_PATTERNS=(
  "^apps/api/"
  "^packages/app-store/applecalendar/"
  "^packages/app-store/caldavcalendar/"
  "^packages/app-store/exchange2013calendar/"
  "^packages/app-store/exchange2016calendar/"
  "^packages/app-store/exchangecalendar/"
  "^packages/app-store/feishucalendar/"
  "^packages/app-store/googlecalendar/"
  "^packages/app-store/ics-feedcalendar/"
  "^packages/app-store/larkcalendar/"
  "^packages/app-store/office365calendar/"
  "^packages/app-store/zohocalendar/"
  "^packages/features/bookings/lib/"
  "^packages/lib/getAggregatedAvailability.ts"
  "^packages/lib/getUserAvailability.ts"
  "^packages/lib/server/getLuckyUser.ts"
  "^packages/lib/slots.ts"
  "^packages/platform/"
  "^packages/prisma/"
  "^packages/trpc/server/routers/viewer/slots/"
  # Add other patterns owned by @calcom/Platform or @calcom/Foundation if they act as platform owners
)
# Keywords indicating potentially low-risk changes (types, imports, exports, signatures)
# This is a basic heuristic.
LOW_RISK_KEYWORDS_REGEX='(^\+|^-) *(import|export|type|interface|class|enum|const|let|var|function|=>|\):)'
# Regex to detect changes likely *inside* function/method bodies (heuristic)
# Avoid lines starting with +/- followed by something other than keywords or comments,
# especially if indented or containing common code constructs. This is very approximate.
POTENTIAL_CODE_LOGIC_REGEX='(^\+|^-) *(  +|\t+|\{|\}|if|for|while|return|await|\.)'

# --- Logic ---

echo "Checking for high-risk changes requiring platform owner approval..."
echo "Base branch: $BASE_BRANCH"
echo "Max lines changed per file: $MAX_LINES_CHANGED"

# Ensure base branch exists and is fetched
git fetch origin main --depth=1 || { echo "Error: Failed to fetch base branch '$BASE_BRANCH'."; exit 1; }

# Get list of changed files compared to base branch
changed_files=$(git diff --name-only $BASE_BRANCH...HEAD)
if [ -z "$changed_files" ]; then
  echo "No changed files detected. Skipping check."
  exit 0
fi

echo -e "\nChanged files:\n$changed_files"

high_risk_found=false

# Loop through each changed file
while IFS= read -r file; do
  is_platform_file=false
  # Check if the file matches any platform pattern
  for pattern in "${PLATFORM_PATTERNS[@]}"; do
    if [[ "$file" =~ $pattern ]]; then
      is_platform_file=true
      break
    fi
  done

  if $is_platform_file; then
    echo -e "\nChecking platform file: $file"

    # Get the diffstat (added/deleted lines) for the file
    diff_stat=$(git diff --numstat $BASE_BRANCH...HEAD -- "$file")
    added_lines=$(echo "$diff_stat" | awk '{print $1}')
    deleted_lines=$(echo "$diff_stat" | awk '{print $2}')
    total_lines=$((added_lines + deleted_lines))

    echo "Lines changed: +$added_lines -$deleted_lines (Total: $total_lines)"

    if [ "$total_lines" -gt "$MAX_LINES_CHANGED" ]; then
      echo "Risk Assessment: HIGH (Exceeded max lines changed: $total_lines > $MAX_LINES_CHANGED)"
      high_risk_found=true
      continue # Move to the next file
    fi

    # Get the actual diff content
    diff_content=$(git diff $BASE_BRANCH...HEAD -- "$file")
    changed_lines_content=$(echo "$diff_content" | grep -E '^(\+|\-)' | grep -vE '^(\+\+\+)|(---)') # Extract lines starting with + or -

    # Heuristic Check: Look for lines *not* matching low-risk patterns
    # and potentially matching code logic patterns.
    suspicious_lines=$(echo "$changed_lines_content" | grep -vE "$LOW_RISK_KEYWORDS_REGEX" ) # Lines NOT matching keywords
    # Further filter suspicious lines to find those potentially indicating code logic
    potential_logic=$(echo "$suspicious_lines" | grep -E "$POTENTIAL_CODE_LOGIC_REGEX")

    if [ -n "$potential_logic" ]; then
        echo "Potential complex code changes detected:"
        echo "$potential_logic" | head -n 5 # Show first few suspicious lines
        echo "Risk Assessment: HIGH (Potential complex logic changes found)"
        high_risk_found=true
    else
        echo "Risk Assessment: LOW (Changes appear limited to types/imports/signatures within line limit)"
    fi
  fi
done <<< "$changed_files"

echo "--- Check Complete --- "

if $high_risk_found; then
  echo "Result: HIGH RISK changes detected in platform-owned files. Manual approval required."
  exit 1 # Fail the check
else
  echo "Result: LOW RISK changes detected (or no platform files changed). No automatic failure."
  exit 0 # Pass the check
fi 