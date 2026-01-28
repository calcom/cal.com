---
title: Mocking Services in Tests
impact: MEDIUM
tags: testing, mocking, calendar, app-store
---

## Mocking Services in Tests

**Impact: MEDIUM**

When mocking calendar services or app-store integrations in Cal.com tests, implement the interface rather than trying to match all properties of specific service implementations.

**Calendar Service Mocks:**

Implement the `Calendar` interface rather than adding individual properties from each specific calendar service type (like `FeishuCalendarService`). Since all calendar services implement the `Calendar` interface and are stored in a map, the mock service should also implement this interface.

**Incorrect:**

```typescript
// Bad - Trying to match all properties of specific service
const mockCalendar = mockDeep<FeishuCalendarService>();
// This causes type compatibility issues with deep mocks
```

**Correct:**

```typescript
// Good - Implement the Calendar interface directly
const mockCalendar: Calendar = {
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getAvailability: vi.fn(),
  // ... other interface methods
};
```

**App-Store Integration Mocks:**

Prefer simpler fake implementations that directly implement required interfaces rather than trying to match complex deep mock structures created with `mockDeep`. This approach is more maintainable and resolves type compatibility issues.

When needed, you can modify other mock files to support your implementation rather than trying to force compatibility with existing mocks.
