---
title: Repository Method Naming Conventions
impact: HIGH
impactDescription: Improves code discoverability and reusability
tags: data, repository, naming, conventions, methods
---

## Repository Method Naming Conventions

**Impact: HIGH**

Repository methods should follow consistent naming conventions to improve discoverability and promote code reuse across different features.

### Rule 1: Don't include the repository's entity name in method names

Method names should be concise and avoid redundancy since the repository class name already indicates the entity type.

```typescript
// Good - Concise method names
class BookingRepository {
  findById(id: string) { ... }
  findByUserId(userId: string) { ... }
  create(data: BookingCreateInput) { ... }
  delete(id: string) { ... }
}

// Bad - Redundant entity name in methods
class BookingRepository {
  findBookingById(id: string) { ... }
  findBookingByUserId(userId: string) { ... }
  createBooking(data: BookingCreateInput) { ... }
  deleteBooking(id: string) { ... }
}
```

### Rule 2: Use `include` or similar keywords for methods that fetch relational data

When a method retrieves additional related entities, make this explicit in the method name using keywords like `include`, `with`, or `andRelations`.

```typescript
// Good - Clear indication of included relations
class EventTypeRepository {
  findById(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
    });
  }

  findByIdIncludeHosts(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
      include: { hosts: true },
    });
  }

  findByIdIncludeHostsAndSchedule(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
      include: { hosts: true, schedule: true },
    });
  }
}

// Bad - Unclear what data is included
class EventTypeRepository {
  findById(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
      include: { hosts: true, schedule: true },
    });
  }

  findByIdForReporting(id: string) {
    return prisma.eventType.findUnique({
      where: { id },
      include: { hosts: true },
    });
  }
}
```

### Rule 3: Keep methods generic and reusable - avoid use-case-specific names

Repository methods should be general-purpose and describe what data they return, not how or where it's used. This promotes code reuse across different features.

```typescript
// Good - Generic, reusable methods
class BookingRepository {
  findByUserIdIncludeAttendees(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: { attendees: true },
    });
  }

  findByDateRangeIncludeEventType(startDate: Date, endDate: Date) {
    return prisma.booking.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: { eventType: true },
    });
  }
}

// Bad - Use-case-specific method names
class BookingRepository {
  findBookingsForReporting(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: { attendees: true },
    });
  }

  findBookingsForDashboard(startDate: Date, endDate: Date) {
    return prisma.booking.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: { eventType: true },
    });
  }
}
```

### Rule 4: No business logic in repositories

Repositories should only handle data access. Business logic, validations, and complex transformations belong in the Service layer.

```typescript
// Good - Repository only handles data access
class BookingRepository {
  findByIdIncludeAttendees(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: { attendees: true },
    });
  }

  updateStatus(id: string, status: BookingStatus) {
    return prisma.booking.update({
      where: { id },
      data: { status },
    });
  }
}

class BookingService {
  async confirmBooking(bookingId: string) {
    const booking = await this.bookingRepository.findByIdIncludeAttendees(bookingId);
    
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "PENDING") {
      throw new Error("Only pending bookings can be confirmed");
    }

    await this.emailService.sendConfirmationToAttendees(booking.attendees);
    return this.bookingRepository.updateStatus(bookingId, "CONFIRMED");
  }
}

// Bad - Business logic in repository
class BookingRepository {
  async confirmBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { attendees: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "PENDING") {
      throw new Error("Only pending bookings can be confirmed");
    }

    await sendEmailToAttendees(booking.attendees);

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
  }
}
```

### Summary

- Method names should be concise: `findById` not `findBookingById`
- Use `include`/`with` keywords when fetching relations: `findByIdIncludeHosts`
- Keep methods generic and reusable: `findByUserIdIncludeAttendees` not `findBookingsForReporting`
- No business logic in repositories - that belongs in Services

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
