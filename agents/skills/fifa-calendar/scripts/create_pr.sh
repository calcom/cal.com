#!/usr/bin/env bash
# Creates a branch, commits changes to fifa/calendario.json and opens a draft PR.
#
# Usage:
#   bash create_pr.sh [SUMMARY_LINE]
#
# SUMMARY_LINE (optional): one-line summary printed at the top of the PR body,
#   e.g. "total=64,added=3,updated=1"
#
# Requires: git, gh (GitHub CLI)

set -euo pipefail

SUMMARY="${1:-}"
BRANCH="chore/update-fifa-calendar-$(date +%Y-%m-%d)"
TEMPLATE_DIR="$(dirname "$0")/../templates"
PR_BODY_TEMPLATE="$TEMPLATE_DIR/pr_body.md"

# ── Sanity checks ────────────────────────────────────────────────────────────
if ! command -v gh &>/dev/null; then
  echo "[ERROR] gh (GitHub CLI) is not installed or not in PATH." >&2
  exit 1
fi

if ! git rev-parse --git-dir &>/dev/null; then
  echo "[ERROR] Not inside a git repository." >&2
  exit 1
fi

# ── Branch ───────────────────────────────────────────────────────────────────
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "[INFO] Branch $BRANCH already exists, checking it out."
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
  echo "[INFO] Created branch $BRANCH."
fi

# ── Stage & commit ───────────────────────────────────────────────────────────
if ! git diff --quiet fifa/calendario.json 2>/dev/null && \
   ! git diff --cached --quiet fifa/calendario.json 2>/dev/null; then
  echo "[INFO] No changes detected in fifa/calendario.json — nothing to commit."
  exit 0
fi

git add fifa/calendario.json
git commit -m "chore: update FIFA 2026 World Cup calendar"
echo "[INFO] Committed changes."

# ── Push ─────────────────────────────────────────────────────────────────────
git push origin "$BRANCH"
echo "[INFO] Pushed $BRANCH to origin."

# ── Build PR body ─────────────────────────────────────────────────────────────
if [[ -f "$PR_BODY_TEMPLATE" ]]; then
  PR_BODY=$(cat "$PR_BODY_TEMPLATE")
  if [[ -n "$SUMMARY" ]]; then
    # Append summary stats after the Changes section
    PR_BODY=$(printf '%s\n\n**Stats:** `%s`' "$PR_BODY" "$SUMMARY")
  fi
else
  PR_BODY="Updated FIFA 2026 World Cup game schedule from official FIFA website."
fi

# ── Create PR ────────────────────────────────────────────────────────────────
PR_URL=$(gh pr create \
  --title "chore: update FIFA 2026 World Cup calendar" \
  --body "$PR_BODY" \
  --draft)

echo "[OK] Draft PR created: $PR_URL"
