#!/usr/bin/env bash
# PreToolUse hook — blocks git push and gh pr create unless the
# corresponding approval token exists for the active harness run.
#
# Claude Code passes the tool input as JSON on stdin.
# Exit 0  → allow the command to proceed.
# Exit 2  → block with the message printed to stdout.

set -euo pipefail

# Read the tool input JSON from stdin
input=$(cat)

# Extract the command string from the Bash tool input
command=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null || true)

# Only inspect git push and gh pr create
if ! echo "$command" | grep -qE '(^|\s)(git push|gh pr create)(\s|$)'; then
  exit 0
fi

# Detect which gate is needed
if echo "$command" | grep -qE '(^|\s)git push(\s|$)'; then
  gate="pr"
elif echo "$command" | grep -qE '(^|\s)gh pr create(\s|$)'; then
  gate="pr"
else
  exit 0
fi

# Locate the active run directory — the most recently modified one
RUNS_DIR=".harness/runs"

if [ ! -d "$RUNS_DIR" ]; then
  echo "BLOCKED: No harness run directory found at $RUNS_DIR. Start a harness run first."
  exit 2
fi

# Find the most recently touched run directory
active_run=$(find "$RUNS_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null \
  | sort -n | tail -1 | awk '{print $2}' || true)

# Fallback: use GNU stat if -printf isn't available (macOS find)
if [ -z "$active_run" ]; then
  active_run=$(find "$RUNS_DIR" -mindepth 1 -maxdepth 1 -type d -exec stat -f '%m %N' {} \; 2>/dev/null \
    | sort -n | tail -1 | awk '{print $2}' || true)
fi

if [ -z "$active_run" ]; then
  echo "BLOCKED: No active harness run found under $RUNS_DIR."
  exit 2
fi

issue=$(basename "$active_run")
token_file="$active_run/approvals/$gate"

if [ ! -f "$token_file" ]; then
  cat <<MSG
BLOCKED: Human approval required before running: $command

Active run: issue #$issue
Missing token: $token_file

To approve, run:
  mkdir -p $active_run/approvals && touch $token_file

Then retry the command.
MSG
  exit 2
fi

exit 0
