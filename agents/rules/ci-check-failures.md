---
title: Handling CI Check Failures
impact: HIGH
tags: ci, testing, e2e
---

## Handling CI Check Failures

**Impact: HIGH**

When reviewing CI check failures in Cal.com, focus only on failures directly related to your code changes.

**Guidelines:**

1. **E2E tests can be flaky** - May fail intermittently due to timing issues
2. **Focus on code-related failures** - Prioritize type checking, linting, unit tests
3. **Infrastructure failures can be ignored** if all code-specific checks pass

**Known CI issues to ignore:**

- `password authentication failed for user postgres` - SAML database misconfiguration
- `Invalid URL` - Related to SAML database misconfiguration

**E2E Test Skipping is Expected:**

When E2E tests show as "skipped", this is intentional:
- The `ready-for-e2e` label has not been added to the PR
- The "required" check intentionally fails to prevent merging without E2E
- **Do not try to fix anything related to skipped E2E tests**

**Incorrect:**

```
# Bad - Trying to investigate why E2E tests are skipped
# Bad - Assuming all CI failures are related to your changes
```

**Correct:**

```
# Good - Focus on failures in files you modified
# Good - Run local type-check and tests first
yarn type-check:ci --force
TZ=UTC yarn test
```
