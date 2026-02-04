---
title: Code Comment Guidelines
impact: MEDIUM
impactDescription: Excessive comments add noise; missing comments hurt maintainability
tags: comments, documentation, readability
---

# Code Comment Guidelines

## General Principle

Keep comments limited and avoid obvious ones. Comments should explain "why" not "what" - the code itself should be clear enough to explain what it does.

## When to Comment

- Complex business logic that isn't obvious from the code
- Workarounds or hacks with explanation of why they're needed
- Non-obvious performance optimizations
- Important security considerations

## When NOT to Comment

```typescript
// ❌ Bad - Obvious comment
// Get the user
const user = await getUser(userId);

// ❌ Bad - Restating the code
// Loop through bookings
for (const booking of bookings) {
  // Process booking
  processBooking(booking);
}
```

## Good Examples

```typescript
// ✅ Good - Explains why, not what
// We need to fetch availability before slots because the timezone
// conversion depends on the user's configured availability rules
const availability = await getAvailability(userId);
const slots = convertToSlots(availability, timezone);

// ✅ Good - Documents a non-obvious constraint
// Google Calendar API has a 2500 event limit per sync request
const BATCH_SIZE = 2500;
```
