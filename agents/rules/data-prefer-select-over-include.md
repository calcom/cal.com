---
title: Prefer Select Over Include in Prisma Queries
impact: HIGH
impactDescription: Reduces data transfer and improves query performance
tags: prisma, database, performance, security
---

## Prefer Select Over Include in Prisma Queries

**Impact: HIGH (Reduces data transfer and improves query performance)**

Using `select` instead of `include` in Prisma queries fetches only the fields you need, improving performance and preventing accidental exposure of sensitive data.

**Incorrect (using include fetches all fields):**

```typescript
const booking = await prisma.booking.findFirst({
  include: {
    user: true, // This gets ALL user fields including sensitive ones
  }
});
```

**Correct (using select for specific fields):**

```typescript
const booking = await prisma.booking.findFirst({
  select: {
    id: true,
    title: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      }
    }
  }
});
```

**Benefits:**
- **Performance**: Smaller payloads, faster queries
- **Security**: Prevents accidental exposure of sensitive fields (e.g., `credential.key`)
- **Clarity**: Makes data requirements explicit

**Exception:** Use `include` only when you genuinely need all fields from a relation, which is rare.

Reference: [Cal.com Engineering Standards](https://cal.com/blog/engineering-in-2026-and-beyond)
