#!/bin/bash
set -e

# Calcom
cd /Users/work/calcom_temp
git checkout main
git reset --hard origin/main
gh pr checkout 25660 -R calcom/cal.com -b feature/original-25660 --force
git remote set-url origin https://github.com/tennisleng/cal.com.git

ORIGIN_BRANCH="feature/original-25660"

# 1. Logic Branch
echo "Creating branch: feat/calcom-lazy-load-logic"
git checkout main
git checkout -b feat/calcom-lazy-load-logic

# Checkout logic files
git checkout $ORIGIN_BRANCH -- \
  apps/web/next.config.js \
  packages/app-store-cli/src/build.ts \
  packages/features/kbar/Kbar.tsx

# Commit
git add .
git commit -m "perf(kbar): Lazy load app store data logic"

# Push
git push origin feat/calcom-lazy-load-logic
gh pr create --repo calcom/cal.com --base main --head tennisleng:feat/calcom-lazy-load-logic --title "perf(kbar): Lazy load app store data logic" --body "Splitting #25660: Core logic implementation."

# 2. Data Branch
echo "Creating branch: feat/calcom-lazy-load-data"
# Base off logic branch so tests pass? Or independent?
# Since logic branch changes how data is loaded, data branch probably needs logic branch?
# Or data branch provides the file that logic branch uses?
# Actually, generated file changes usually imply structure change. 
# If I change logic to read X but X is not there, it breaks.
# So Data branch should be based on Logic branch (or vice versa).
# The generated file `apps.list.generated.json` is likely new or modified.
# If I base Data on Logic, Data contains everything.
# If I want two PRs, I can base Data on Logic.
git checkout feat/calcom-lazy-load-logic
git checkout -b feat/calcom-lazy-load-data

# Checkout generated file
git checkout $ORIGIN_BRANCH -- packages/app-store/apps.list.generated.json

# Commit
git add packages/app-store/apps.list.generated.json
git commit -m "chore(app-store): Update generated apps list"

# Push
git push origin feat/calcom-lazy-load-data
gh pr create --repo calcom/cal.com --base main --head tennisleng:feat/calcom-lazy-load-data --title "chore(app-store): Update generated apps list" --body "Splitting #25660: Generated data file. Depends on #logic-pr"

echo "Done splitting #25660"
