---
title: Playwright Test Execution
impact: MEDIUM
tags: testing, playwright, e2e
---

## Playwright Test Execution

**Impact: MEDIUM**

Always ensure Playwright tests pass locally before pushing code. Use fast local E2E feedback loops instead of relying on CI, which is too slow for development iteration.

**Command format:**

```bash
# Run specific E2E test file
PLAYWRIGHT_HEADLESS=1 yarn e2e path/to/file.e2e.ts

# Run specific test within a file
PLAYWRIGHT_HEADLESS=1 yarn e2e path/to/file.e2e.ts --grep "specific test name"
```

**Incorrect:**

```bash
# Don't use standard playwright command
yarn playwright test path/to/file.e2e.ts
```

**Correct:**

```bash
# Use the repository's e2e runner with proper settings
PLAYWRIGHT_HEADLESS=1 yarn e2e path/to/file.e2e.ts
```

The `PLAYWRIGHT_HEADLESS=1` environment variable ensures tests run without a visible browser window. Never push test code until those tests are passing locally first.
