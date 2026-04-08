---
title: Playwright E2E Testing
impact: HIGH
impactDescription: E2E tests catch integration issues before production
tags: testing, playwright, e2e
---

# Playwright E2E Testing

## Running Tests

Use the command format:

```bash
PLAYWRIGHT_HEADLESS=1 yarn e2e [test-file.e2e.ts]
```

This format includes the proper timezone setting, virtual display server, and uses the repository's e2e runner.

**Do not use** the standard `yarn playwright test` command.

## Local Testing First

Always ensure Playwright tests pass locally before pushing code. The user requires fast local e2e feedback loops instead of relying on CI, which is too slow for development iteration.

**Never push test code until those tests are passing locally first.**

## CI Behavior

- E2E tests will only run if PR has "ready-for-e2e" label
- When E2E tests are skipped, the "required" check intentionally fails to prevent merging without E2E
- Do not try to fix anything related to skipped E2E tests - this is expected behavior
