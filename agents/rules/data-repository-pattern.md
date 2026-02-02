---
title: Isolate Technology Choices Behind Repositories
impact: CRITICAL
impactDescription: Enables technology changes without codebase-wide refactors
tags: data, repository, prisma, orm, isolation
---

## Isolate Technology Choices Behind Repositories

**Impact: CRITICAL**

Technology choices must not seep through the application. The Prisma problem illustrates this perfectly: we currently have references to Prisma scattered across hundreds of files. This creates massive coupling and makes technology changes prohibitively expensive.

**Incorrect (Prisma leaking throughout codebase):**

```typescript
// In a service file
import { prisma } from "@calcom/prisma";

async function getBooking(id: number) {
  // Direct Prisma usage in service
  return prisma.booking.findFirst({
    where: { id },
    include: { user: true }
  });
}
```

**Correct (Repository abstraction):**

```typescript
// In repository file
import { prisma } from "@calcom/prisma";

export class BookingRepository {
  async findById(id: number): Promise<BookingDTO | null> {
    const booking = await prisma.booking.findFirst({
      where: { id },
      select: { id: true, title: true, userId: true }
    });
    return booking ? this.toDTO(booking) : null;
  }
}

// In service file - no Prisma knowledge
import { BookingRepository } from "./repositories/BookingRepository";

async function getBooking(id: number) {
  return this.bookingRepository.findById(id);
}
```

**The standard:**
- All database access must go through Repository classes
- Repositories are the only code that knows about Prisma (or any other ORM)
- No business logic should be in repositories
- Repositories are injected via Dependency Injection containers

**Benefits:**
If we ever switch from Prisma to Drizzle or another ORM, the only changes required are:
- Repository implementations
- DI container wiring for new repositories
- Nothing else in the codebase should care or change

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
