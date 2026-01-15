# Forking Cal.com and Working with Private Repository

## Quick Setup

### 1. Fork on GitHub
1. Go to https://github.com/calcom/cal.com
2. Click "Fork" button
3. Choose your account/organization
4. Select visibility (public or private)

### 2. Configure Git Remotes

**Option A: Replace origin with your fork (Recommended)**
```bash
# Replace origin with your fork
git remote set-url origin https://github.com/YOUR_USERNAME/cal.com.git

# Add original Cal.com as upstream
git remote add upstream https://github.com/calcom/cal.com.git

# Verify
git remote -v
# Should show:
# origin    https://github.com/YOUR_USERNAME/cal.com.git (fetch)
# origin    https://github.com/YOUR_USERNAME/cal.com.git (push)
# upstream  https://github.com/calcom/cal.com.git (fetch)
# upstream  https://github.com/calcom/cal.com.git (push)
```

**Option B: Keep origin, add fork as separate remote**
```bash
# Add your fork as new remote
git remote add fork https://github.com/YOUR_USERNAME/cal.com.git

# Keep origin pointing to calcom/cal.com (for syncing)
# Push to your fork with: git push fork branch-name
```

### 3. Create a Branch
```bash
# Create and switch to new branch
git checkout -b feature/your-feature-name

# Or using newer syntax
git switch -c feature/your-feature-name
```

### 4. Make Changes
Make your code changes as usual.

### 5. Commit and Push
```bash
# Stage changes
git add .

# Commit (follow conventional commits)
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name

# Or if using Option B:
git push fork feature/your-feature-name
```

### 6. Create Pull Request
1. Go to your fork on GitHub: `https://github.com/YOUR_USERNAME/cal.com`
2. You'll see a banner suggesting to create a PR
3. Click "Compare & pull request"
4. Select:
   - Base repository: `YOUR_USERNAME/cal.com`
   - Base branch: `main` (or `master`)
   - Compare branch: `feature/your-feature-name`
5. Fill in PR description
6. Create pull request (can be draft if not ready)

## Syncing with Upstream (Original Cal.com)

### Sync main branch
```bash
# Fetch latest from upstream
git fetch upstream

# Switch to main
git checkout main

# Merge upstream changes
git merge upstream/main

# Or rebase (cleaner history)
git rebase upstream/main

# Push to your fork
git push origin main
```

### Sync feature branch with latest changes
```bash
# While on your feature branch
git fetch upstream
git rebase upstream/main  # or merge: git merge upstream/main
git push origin feature/your-feature-name --force-with-lease  # if rebased
```

## Daily Workflow

### Starting new work
```bash
# Make sure main is up to date
git checkout main
git pull upstream main
git push origin main

# Create new branch
git checkout -b feature/new-feature

# Make changes, commit, push
git add .
git commit -m "feat: your commit message"
git push origin feature/new-feature
```

### Working on existing PR
```bash
# Switch to your branch
git checkout feature/your-feature-name

# Make changes
# ... edit files ...

# Commit and push
git add .
git commit -m "fix: your fix message"
git push origin feature/your-feature-name
```

## Important Notes

### Licensing (AGPLv3)
- Cal.com is AGPLv3 licensed
- **Private forks**: Allowed for personal use and development
- **Public forks**: Required if you want to distribute or use commercially
- **Contributing back**: Pull requests to original repo must follow their CLA
- See `LICENSE` file for full details

### Contributing Back to Cal.com
If you want to contribute changes back to the original Cal.com repository:

1. Keep your fork in sync with upstream
2. Make your changes in a branch
3. Push to YOUR fork
4. Create a PR from your fork to `calcom/cal.com` (not your own repo)
5. Follow Cal.com's contribution guidelines
6. Sign their CLA if required

### Common Git Commands Reference

```bash
# Check current branch and remotes
git branch -a
git remote -v

# See what branch you're on
git status

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git checkout -- <file>

# Stash changes temporarily
git stash
git stash pop
```

## Troubleshooting

### "Permission denied" when pushing
- Make sure you've forked the repo to your GitHub account
- Use your GitHub username in the remote URL
- Use SSH keys or GitHub CLI for authentication

### "Remote upstream not found"
```bash
# Add upstream if missing
git remote add upstream https://github.com/calcom/cal.com.git
```

### "Branch is out of date"
```bash
# Rebase your branch on latest upstream
git fetch upstream
git rebase upstream/main
git push origin feature/your-branch --force-with-lease
```
