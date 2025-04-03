#!/bin/bash

set -eo pipefail

# --- Configuration ---
# Lines changed threshold - PR changes with more lines are automatically considered high-risk
MAX_LINES_CHANGED=10

BASE_BRANCH="origin/main"

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
)

# --- Core Logic ---

echo "Checking for high-risk changes requiring platform owner approval..."
echo "Base branch: $BASE_BRANCH"
echo "Max lines changed per file: $MAX_LINES_CHANGED"

# Fetch base branch for diff comparison
git fetch origin main --depth=1 || { echo "Error: Failed to fetch base branch '$BASE_BRANCH'."; exit 1; }

changed_files=$(git diff --name-only $BASE_BRANCH...HEAD)
if [ -z "$changed_files" ]; then
  echo "No changed files detected. Skipping check."
  exit 0
fi

echo -e "\nChanged files:\n$changed_files"

high_risk_found=false

while IFS= read -r file; do
  is_platform_file=false
  
  for pattern in "${PLATFORM_PATTERNS[@]}"; do
    if [[ "$file" =~ $pattern ]]; then
      is_platform_file=true
      break
    fi
  done

  if $is_platform_file; then
    echo -e "\nChecking platform file: $file"

    # First risk heuristic: Line count - too many changes are automatically high-risk
    diff_stat=$(git diff --numstat $BASE_BRANCH...HEAD -- "$file")
    added_lines=$(echo "$diff_stat" | awk '{print $1}')
    deleted_lines=$(echo "$diff_stat" | awk '{print $2}')
    total_lines=$((added_lines + deleted_lines))

    echo "Lines changed: +$added_lines -$deleted_lines (Total: $total_lines)"

    if [ "$total_lines" -gt "$MAX_LINES_CHANGED" ]; then
      echo "Risk Assessment: HIGH (Exceeded max lines changed: $total_lines > $MAX_LINES_CHANGED)"
      high_risk_found=true
      continue
    fi

    # Second risk heuristic: Content analysis - look for actual code changes vs type/interface changes
    diff_content=$(git diff $BASE_BRANCH...HEAD -- "$file")
    changed_lines_content=$(echo "$diff_content" | grep -E '^(\+|\-)' | grep -vE '^(\+\+\+)|(---)') 

    echo -e "\nChanged content in '$file':"
    echo "$changed_lines_content"
    
    high_risk_found_in_file=false
    
    # Examine each changed line for potential logic modifications
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      
      first_char="${line:0:1}"
      [[ "$first_char" != "+" && "$first_char" != "-" ]] && continue
      
      content="${line:1}"
      content="${content#"${content%%[![:space:]]*}"}"
      
      # Safe changes: imports, exports, type definitions, interface declarations, etc.
      if [[ "$content" == import* ]] || 
         [[ "$content" == export* ]] || 
         [[ "$content" == type* ]] || 
         [[ "$content" == interface* ]] ||
         [[ "$content" == enum* ]] || 
         [[ "$content" =~ ^[a-zA-Z_][a-zA-Z0-9_]*(\?)?:\ .* ]] || 
         [[ "$content" =~ ^(const|let|var)\ [a-zA-Z_][a-zA-Z0-9_]*:\ .* ]]; then
        continue
      fi
      
      # Any other changes are considered potentially high-risk
      echo "Potential complex code change: $line"
      high_risk_found_in_file=true
      break
    done <<< "$changed_lines_content"
    
    if $high_risk_found_in_file; then
      echo "Risk Assessment: HIGH (Potential complex code changes found)"
      high_risk_found=true
    else
      echo "Risk Assessment: LOW (Changes appear limited to types/imports/signatures within line limit)"
    fi
  fi
done <<< "$changed_files"

echo "--- Check Complete --- "

if $high_risk_found; then
  echo "Result: HIGH RISK changes detected in platform-owned files. Manual approval required."
  exit 1 
else
  echo "Result: LOW RISK changes detected (or no platform files changed). No automatic failure."
  exit 0 
fi 