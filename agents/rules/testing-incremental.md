---
title: Incremental Test Fixing
impact: MEDIUM
impactDescription: Methodical approach prevents getting overwhelmed by test failures
tags: testing, debugging, workflow
---

# Incremental Test Fixing

## One File at a Time

When fixing failing tests in the Cal.com repository, take an incremental approach by addressing one file at a time rather than attempting to fix all issues simultaneously.

This methodical approach makes it easier to identify and resolve specific issues without getting overwhelmed by the complexity of multiple failing tests across different files.

## Recommended Order

1. Run `yarn type-check:ci --force` to identify TypeScript type errors
2. Run `yarn test` to identify failing unit tests
3. Address both type errors and failing tests before considering the task complete
4. Type errors often need to be fixed first as they may be causing the test failures

## Focus Strategy

- Focus on getting each file's tests passing completely before moving on to the next file
- Fix type errors before test failures - they're often the root cause
- Run `yarn prisma generate` if you see missing enum/type errors
