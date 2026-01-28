---
title: Pull Request Best Practices
impact: HIGH
tags: pr, git, review
---

## Pull Request Best Practices

**Impact: HIGH**

Follow these practices when creating pull requests in Cal.com.

**Create PRs in draft mode:**

Always create pull requests in draft mode by default, so that a human can mark it as ready for review only when appropriate.

```bash
gh pr create --draft --title "feat: add booking notification" --body "..."
```

**PR Title - Conventional Commits:**

Use conventional commit format for PR titles:

```
feat: add booking notification system
fix: handle timezone edge case in booking creation
refactor: extract calendar sync logic
```

**Incorrect titles:**

```
# Bad - Generic
fix: booking bug
update: changes
# Bad - No prefix
Add new feature
```

**Size Limits:**

- **Lines changed**: Keep under 500 lines (additions + deletions)
- **Files changed**: Keep under 10 code files
- **Single responsibility**: Each PR should do one thing well

Note: These limits apply to code files only. Documentation, lock files, and auto-generated files are excluded.

**When reviewing PRs:**

Focus on providing a clear summary of what the PR is doing and its core functionality. Avoid getting sidetracked by CI failures, testing issues, or technical implementation details unless specifically requested.

**PR Checklist:**

- [ ] Title follows conventional commits
- [ ] Type check passes: `yarn type-check:ci --force`
- [ ] Lint passes: `yarn biome check --write .`
- [ ] Relevant tests pass
- [ ] Diff is small and focused
- [ ] No secrets or API keys committed
- [ ] UI strings added to translation files
- [ ] Created as draft PR
