---
title: Type Check Before Tests
impact: HIGH
tags: ci, typescript, testing
---

## Type Check Before Tests

**Impact: HIGH**

When working on issues in the Cal.com repository, prioritize fixing type issues before addressing failing tests. Type errors are often the root cause of test failures.

**Order of operations:**

1. Run `yarn type-check:ci --force` first
2. Fix all TypeScript errors
3. Then run `TZ=UTC yarn test`
4. Address remaining test failures

**Why `--force` flag:**

The `--force` flag bypasses caching to ensure fresh results. Always use it to avoid stale type-check results.

**Incorrect:**

```bash
# Bad - Running tests before type check
yarn test
# Then wondering why tests fail

# Bad - Using type-check without --force
yarn type-check
```

**Correct:**

```bash
# Good - Type check first with force flag
yarn type-check:ci --force

# Fix any type errors, then run tests
TZ=UTC yarn test
```

**Important:**

Even if errors appear in files you haven't directly modified, your changes might still be causing type issues through dependencies or type inference. Compare type check results between the main branch and your feature branch to confirm whether you've introduced new type errors.
