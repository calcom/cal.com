---
title: Git and CI Workflow
impact: HIGH
tags: ci, git, workflow
---

## Git and CI Workflow

**Impact: HIGH**

Follow proper git workflow to ensure CI runs correctly and code safety is maintained.

**Push before checking CI:**

Always push committed changes to the remote repository before waiting for or checking CI status. CI runs on the remote repository state, not local commits.

**Correct sequence:**

1. Commit locally
2. Run local checks (`yarn type-check:ci --force`, `yarn test`)
3. Push to remote
4. Monitor CI status

**Incorrect:**

```bash
# Bad - Waiting for CI on unpushed commits
git commit -m "fix: something"
# Then checking CI status without pushing
```

**Correct:**

```bash
# Good - Push then check CI
git commit -m "fix: something"
git push origin feature-branch
# Now monitor CI status
```

**Never force push to protected branches:**

- Never force push to `main` or `master`
- Never force push to production branches
- Use regular push or create new commits instead

**Branch operations:**

When asked to move changes to a different branch, use git commands to commit existing changes to the specified branch rather than redoing the work. This is more efficient and prevents duplication of effort.
