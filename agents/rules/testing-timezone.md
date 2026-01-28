---
title: Timezone Handling in Tests
impact: HIGH
impactDescription: Timezone bugs are hard to reproduce without consistent test environments
tags: testing, timezone, consistency
---

# Timezone Handling in Tests

## Always Use TZ=UTC

When running tests in the Cal.com repository, use the `TZ=UTC` environment variable:

```bash
TZ=UTC yarn test
```

This ensures consistent timezone handling and prevents timezone-related test failures that might occur when tests are run in different environments or by different developers with varying local timezone settings.

## Why This Matters

- Tests may pass locally but fail in CI (or vice versa)
- Date/time assertions become unpredictable
- Debugging timezone issues is time-consuming

## Test Commands

```bash
# Unit tests
TZ=UTC yarn test

# Specific test file
TZ=UTC yarn vitest run path/to/file.test.ts

# E2E tests (already configured in yarn e2e)
PLAYWRIGHT_HEADLESS=1 yarn e2e
```
