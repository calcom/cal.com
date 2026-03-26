---
title: Maintain 80%+ Test Coverage for New Code
impact: HIGH
impactDescription: Prevents bugs and enables confident refactoring
tags: testing, coverage, quality, ci
---

## Maintain 80%+ Test Coverage for New Code

**Impact: HIGH**

Every PR must have near-80%+ test coverage for the code it introduces or modifies. This is enforced automatically in our CI pipeline. If you add 50 lines of new code, those 50 lines must be covered by tests. If you modify an existing function, your changes must be tested.

**Coverage requirements:**
- Overall test coverage: 80%+ for new code
- Unit test coverage: Near 100%, especially with AI assistance for generating tests
- Global coverage tracking as a key metric that improves over time

**Incorrect (untested code):**

```typescript
// New function with no tests
export function calculateAvailability(user: User, date: Date): TimeSlot[] {
  // Complex logic here...
  // No corresponding test file
}
```

**Correct (comprehensive tests):**

```typescript
// calculateAvailability.ts
export function calculateAvailability(user: User, date: Date): TimeSlot[] {
  // Complex logic here...
}

// calculateAvailability.test.ts
describe("calculateAvailability", () => {
  it("returns empty array for user with no schedule", () => {
    const user = createMockUser({ schedules: [] });
    expect(calculateAvailability(user, new Date())).toEqual([]);
  });

  it("excludes busy times from available slots", () => {
    const user = createMockUser({
      schedules: [mockSchedule],
      busyTimes: [mockBusyTime],
    });
    const slots = calculateAvailability(user, new Date());
    expect(slots).not.toContainEqual(expect.objectContaining({
      start: mockBusyTime.start,
    }));
  });

  it("handles timezone conversions correctly", () => {
    // Test timezone edge cases
  });
});
```

**Addressing the "coverage isn't the full story" argument:**
Yes, we know coverage doesn't guarantee perfect tests. We know you can write meaningless tests that hit every line but test nothing meaningful. We know coverage is just one metric among many. But it's surely better to shoot for a high percentage than to have no idea where you are at all.

**Leverage AI for test generation:**
AI can quickly and intelligently build comprehensive test suites. Manual testing is more and more a thing of the past.

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
