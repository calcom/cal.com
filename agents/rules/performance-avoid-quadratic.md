---
title: Avoid O(n²) Algorithms - Design for Enterprise Scale
impact: CRITICAL
impactDescription: Prevents performance collapse at scale
tags: performance, algorithms, complexity, scale
---

## Avoid O(n²) Algorithms - Design for Enterprise Scale

**Impact: CRITICAL**

We build for large organizations and teams. What works fine with 10 users or 50 records can collapse under the weight of enterprise scale. Performance is not something we optimize later. It's something we build correctly from the start.

When building features, always ask: "How does this behave with 1,000 users? 10,000 records? 100,000 operations?"

**Common O(n²) patterns to avoid:**
- Nested array iterations (`.map` inside `.map`, `.forEach` inside `.forEach`)
- Array methods like `.some`, `.find`, or `.filter` inside loops or callbacks
- Checking every item against every other item without optimization
- Chained filters or nested mapping over large lists

**Incorrect (O(n²) - exponential slowdown):**

```typescript
// Bad: O(n²) - checks every slot against every busy time
const available = availableSlots.filter(slot => {
  return !busyTimes.some(busy => checkOverlap(slot, busy));
});

// For 100 slots and 50 busy periods: 5,000 checks
// For 500 slots and 200 busy periods: 100,000 checks (20x increase!)
```

**Correct (O(n log n) - scales gracefully):**

```typescript
// Good: O(n log n) - sort once, break early
const sortedBusy = [...busyTimes].sort((a, b) => a.start - b.start);

const available = availableSlots.filter(slot => {
  // Binary search or early exit
  const index = binarySearch(sortedBusy, slot.start);
  return !hasOverlapAt(sortedBusy, index, slot);
});
```

**Better data structures and algorithms:**
- **Sorting + early exit**: Sort data once, break out of loops when remaining items won't match
- **Binary search**: Use for lookups in sorted arrays instead of linear scans
- **Two-pointer techniques**: For merging or intersecting sorted sequences
- **Hash maps/sets**: Use for O(1) lookups instead of `.find` or `.includes` on arrays
- **Interval trees**: For scheduling, availability, and range queries

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
