---
title: Leverage AI for Boilerplate and Testing
impact: MEDIUM
impactDescription: Accelerates development while maintaining quality
tags: culture, ai, automation, testing
---

## Leverage AI for Boilerplate and Testing

**Impact: MEDIUM**

Generate 80% of boilerplate and non-critical code using AI, allowing us to focus solely on complex business logic and critical architectures.

**Where AI excels:**
- Generating boilerplate code (DTOs, basic CRUD operations)
- Building comprehensive test suites
- Creating documentation
- Repetitive refactoring tasks
- Code review assistance

**Where humans must focus:**
- Complex business logic
- Critical architectural decisions
- Security-sensitive code
- Performance-critical algorithms
- Domain-specific edge cases

**Example - AI-assisted test generation:**

```typescript
// Human writes the function
export function calculateOverlap(slot: TimeSlot, busy: BusyTime): boolean {
  return slot.start < busy.end && slot.end > busy.start;
}

// AI generates comprehensive tests
describe("calculateOverlap", () => {
  it("returns true when slot starts during busy period", () => {
    // AI-generated test case
  });

  it("returns true when slot ends during busy period", () => {
    // AI-generated test case
  });

  it("returns false when slot is completely before busy period", () => {
    // AI-generated test case
  });

  it("returns false when slot is completely after busy period", () => {
    // AI-generated test case
  });

  it("returns true when slot completely contains busy period", () => {
    // AI-generated test case
  });

  it("returns true when busy period completely contains slot", () => {
    // AI-generated test case
  });

  // AI identifies edge cases humans might miss
  it("handles exact boundary matches correctly", () => {
    // AI-generated edge case
  });
});
```

**Our CI is the final boss:**
- Everything in our standards document is checked before code is merged in PRs
- No surprises make it into main
- Checks are fast and useful
- AI helps ensure comprehensive coverage

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
