---
title: Code Comment Guidelines
impact: MEDIUM
tags: comments, documentation, code-quality
---

## Code Comment Guidelines

**Impact: MEDIUM**

Keep comments limited and purposeful. The code itself should be clear enough to explain what it does.

**Comments should explain "why" not "what":**

```typescript
// Bad - Explains what (obvious from code)
// Loop through all bookings
for (const booking of bookings) {
  // Check if booking is confirmed
  if (booking.status === "confirmed") {
    // Add to confirmed list
    confirmedBookings.push(booking);
  }
}

// Good - Explains why (not obvious from code)
// Filter out cancelled bookings early to avoid unnecessary
// calendar API calls which are rate-limited
const activeBookings = bookings.filter(b => b.status !== "cancelled");
```

**When to add comments:**

- Complex business logic that isn't self-evident
- Workarounds for known issues (with ticket reference)
- API quirks or external system behaviors
- Performance optimizations that might look unnecessary

**When NOT to add comments:**

- Restating what the code does
- Explaining standard patterns
- Documenting obvious type information
- Adding TODO comments without ticket references

**Incorrect:**

```typescript
// Get user by ID
const user = await getUserById(id);

// Return the user
return user;
```

**Correct:**

```typescript
// Use cached lookup to avoid N+1 queries during bulk operations
const user = await userCache.getOrFetch(id);

return user;
```
