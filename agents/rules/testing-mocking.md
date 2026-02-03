---
title: Mock Implementation Patterns
impact: MEDIUM
impactDescription: Poor mocks cause flaky tests and false positives
tags: testing, mocking, calendar, app-store
---

# Mock Implementation Patterns

## Calendar Service Mocks

When mocking calendar services in Cal.com test files, implement the `Calendar` interface rather than adding individual properties from each specific calendar service type (like `FeishuCalendarService`).

Since all calendar services implement the `Calendar` interface and are stored in a map, the mock service should also implement this interface to ensure type compatibility.

## App-Store Integration Mocks

When mocking app-store resources in Cal.com tests, prefer implementing simpler mock designs that directly implement the required interfaces rather than trying to match complex deep mock structures created with `mockDeep`.

This approach is more maintainable and helps resolve type compatibility issues.

## General Guidance

- For complex mocks that cause type compatibility issues with deep mocks, consider using simpler fake implementations
- When needed, you can modify other mock files to support your implementation
- Creative solutions and refactoring to better designs are encouraged when standard mocking causes persistent type errors
