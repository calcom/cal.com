---
title: Timezone Handling in Tests
impact: MEDIUM
tags: testing, timezone, consistency
---

## Timezone Handling in Tests

**Impact: MEDIUM**

Always use the `TZ=UTC` environment variable when running tests to ensure consistent timezone handling across different environments.

**Why this matters:**

Tests can produce different results depending on the local timezone of the machine running them. Using UTC ensures:
- Consistent results across all developer machines
- Matching behavior between local runs and CI
- Predictable date/time assertions

**Incorrect:**

```bash
# Bad - Results vary by developer's local timezone
yarn test
yarn vitest run path/to/file.test.ts
```

**Correct:**

```bash
# Good - Consistent timezone for all test runs
TZ=UTC yarn test
TZ=UTC yarn vitest run path/to/file.test.ts
```

This is especially important for tests involving:
- Date calculations and comparisons
- Booking time slots
- Calendar integrations
- Scheduled events
