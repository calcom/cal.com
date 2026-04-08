---
title: CI Check Failure Handling
impact: HIGH
impactDescription: Misinterpreting CI failures wastes debugging time
tags: ci, debugging, workflow
---

# CI Check Failure Handling

## What to Focus On

When reviewing CI check failures in Cal.com:

1. **E2E tests can be flaky** and may fail intermittently
2. **Focus only on CI failures that are directly related to your code changes**
3. Infrastructure-related failures (like dependency installation issues) can be disregarded if all code-specific checks pass

## Known CI Issues to Ignore

These errors are related to SAML database misconfiguration on CI and should be ignored:
- "password authentication failed for user postgres"
- "Invalid URL"

## E2E Tests Skipping

**E2E tests skipping is expected behavior:**
- When E2E tests are skipped, it's because the `ready-for-e2e` label has not been added to the PR
- The "required" check intentionally fails when E2E tests are skipped to prevent merging without E2E
- Do not try to fix anything related to skipped E2E tests - this is completely expected and normal

## Before Blaming CI

Always run type checks locally using `yarn type-check:ci --force` before concluding that CI failures are unrelated to your changes. Even if errors appear in files you haven't directly modified, your changes might still be causing type issues through dependencies or type inference.
