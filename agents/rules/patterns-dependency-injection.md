---
title: Use Dependency Injection for Loose Coupling
impact: HIGH
impactDescription: Enables testing, flexibility, and clean architecture
tags: patterns, dependency-injection, testing, coupling
---

## Use Dependency Injection for Loose Coupling

**Impact: HIGH**

Dependency Injection enables loose coupling, facilitates testing, and isolates concerns. Dependencies should be injected via DI containers rather than instantiated directly within classes.

**Incorrect (tight coupling with direct instantiation):**

```typescript
class BookingService {
  // Tight coupling - hard to test, hard to swap implementations
  private repository = new BookingRepository();
  private emailService = new EmailService();
  private calendarService = new GoogleCalendarService();

  async createBooking(data: CreateBookingDTO) {
    const booking = await this.repository.create(data);
    await this.emailService.sendConfirmation(booking);
    await this.calendarService.createEvent(booking);
    return booking;
  }
}
```

**Correct (dependency injection):**

```typescript
class BookingService {
  constructor(
    private readonly repository: BookingRepository,
    private readonly emailService: EmailService,
    private readonly calendarService: CalendarService, // Interface, not concrete
  ) {}

  async createBooking(data: CreateBookingDTO) {
    const booking = await this.repository.create(data);
    await this.emailService.sendConfirmation(booking);
    await this.calendarService.createEvent(booking);
    return booking;
  }
}

// In DI container configuration
container.register(BookingService, {
  useFactory: (c) => new BookingService(
    c.resolve(BookingRepository),
    c.resolve(EmailService),
    c.resolve(CalendarService),
  ),
});

// In tests - easy to mock
const mockRepository = createMock<BookingRepository>();
const mockEmailService = createMock<EmailService>();
const mockCalendarService = createMock<CalendarService>();

const service = new BookingService(
  mockRepository,
  mockEmailService,
  mockCalendarService,
);
```

**Required patterns:**
- **Application Services**: Orchestrate use cases, coordinate between domain services and repositories
- **Domain Services**: Contain business logic that doesn't naturally belong to a single entity
- **Repositories**: Abstract data access, isolate technology choices
- **Caching Proxies**: Wrap repositories or services to add caching behavior transparently
- **Decorators**: Add cross-cutting concerns (logging, metrics) without polluting domain logic

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
