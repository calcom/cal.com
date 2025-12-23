#!/bin/bash

# Parallel Storybook story generation using Claude Code headless mode
# Usage: ./generate-stories.sh [--dry-run] [--max-concurrent N] [--filter PATTERN]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PROMPT_FILE="$SCRIPT_DIR/prompts/story-prompt.md"

# Default settings
MAX_CONCURRENT=3
DRY_RUN=false
FILTER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --max-concurrent)
      MAX_CONCURRENT="$2"
      shift 2
      ;;
    --filter)
      FILTER="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Load prompt template
if [[ ! -f "$PROMPT_FILE" ]]; then
  log_error "Prompt file not found: $PROMPT_FILE"
  exit 1
fi

PROMPT_TEMPLATE=$(cat "$PROMPT_FILE")

# Get components needing stories
log_info "Discovering components without stories..."
cd "$SCRIPT_DIR"

COMPONENTS_JSON=$(npx tsx discover-components.ts --json 2>/dev/null)

if [[ -z "$COMPONENTS_JSON" || "$COMPONENTS_JSON" == "[]" ]]; then
  log_success "All components already have stories!"
  exit 0
fi

# Parse JSON and filter if needed
COMPONENTS=$(echo "$COMPONENTS_JSON" | jq -r '.[] | "\(.name)|\(.relativePath)"')

if [[ -n "$FILTER" ]]; then
  COMPONENTS=$(echo "$COMPONENTS" | grep "$FILTER" || true)
fi

TOTAL=$(echo "$COMPONENTS" | wc -l | tr -d ' ')

if [[ "$TOTAL" -eq 0 ]]; then
  log_warn "No components match filter: $FILTER"
  exit 0
fi

log_info "Found $TOTAL components to process (max $MAX_CONCURRENT concurrent)"

if [[ "$DRY_RUN" == "true" ]]; then
  log_warn "DRY RUN - not actually generating stories"
  echo "$COMPONENTS" | while IFS='|' read -r name path; do
    echo "  Would generate: $path"
  done
  exit 0
fi

# Track progress
COMPLETED=0
FAILED=0
RUNNING=0
declare -a PIDS=()
declare -A PID_COMPONENTS=()

# Function to generate a single story
generate_story() {
  local name="$1"
  local component_path="$2"
  local log_file="$LOG_DIR/${name}.log"
  local story_dir=$(dirname "$REPO_ROOT/$component_path")
  local story_file="$story_dir/${name}.stories.tsx"

  # Build the prompt
  local prompt="$PROMPT_TEMPLATE

Component to create story for:
- Name: $name
- Path: $component_path

Read the component file first, understand its props and behavior, then create the story file at:
$story_file"

  # Run claude with the prompt
  cd "$REPO_ROOT"

  if claude -p "$prompt" \
    --allowedTools "Read,Write,Edit,Glob,Grep" \
    > "$log_file" 2>&1; then
    return 0
  else
    return 1
  fi
}

# Process components with concurrency limit
echo "$COMPONENTS" | while IFS='|' read -r name path; do
  # Wait if at max concurrent
  while [[ ${#PIDS[@]} -ge $MAX_CONCURRENT ]]; do
    # Wait for any job to finish
    for i in "${!PIDS[@]}"; do
      pid="${PIDS[$i]}"
      if ! kill -0 "$pid" 2>/dev/null; then
        # Job finished, check exit status
        if wait "$pid"; then
          log_success "Completed: ${PID_COMPONENTS[$pid]}"
          ((COMPLETED++)) || true
        else
          log_error "Failed: ${PID_COMPONENTS[$pid]} (check logs/${PID_COMPONENTS[$pid]}.log)"
          ((FAILED++)) || true
        fi
        unset "PIDS[$i]"
        unset "PID_COMPONENTS[$pid]"
      fi
    done
    # Rebuild array to remove gaps
    PIDS=("${PIDS[@]}")
    sleep 1
  done

  # Start new job
  log_info "Starting: $name ($path)"
  generate_story "$name" "$path" &
  pid=$!
  PIDS+=("$pid")
  PID_COMPONENTS[$pid]="$name"
done

# Wait for remaining jobs
for pid in "${PIDS[@]}"; do
  if wait "$pid"; then
    log_success "Completed: ${PID_COMPONENTS[$pid]}"
    ((COMPLETED++)) || true
  else
    log_error "Failed: ${PID_COMPONENTS[$pid]}"
    ((FAILED++)) || true
  fi
done

# Summary
echo ""
echo "========================================"
log_info "Generation complete!"
echo "  Completed: $COMPLETED"
echo "  Failed: $FAILED"
echo "  Total: $TOTAL"
echo "========================================"

if [[ $FAILED -gt 0 ]]; then
  log_warn "Check logs in $LOG_DIR for failed components"
  exit 1
fi
