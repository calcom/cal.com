# Test Utilities Guide

This guide explains Cal.com's two-layer test utility system designed to provide both simplicity for beginners and flexibility for advanced users.

## Architecture Overview

### Foundation Layer: `packages/lib/test/testHelpers.ts`
- **Purpose**: Advanced builder classes and low-level utilities
- **Target**: Complex custom scenarios, non-booking tests, advanced configurations
- **Strengths**: Highly flexible, chainable methods, comprehensive coverage

### Convenience Layer: `apps/web/test/utils/bookingScenario/testHelpers.ts`
- **Purpose**: Ready-to-use setup functions for common booking scenarios
- **Target**: Beginners and 90% of booking test cases
- **Strengths**: Beginner-friendly, sensible defaults, complete test setup

## For Beginners: Use Booking Scenario Helpers

### Simple, Ready-to-Use Functions
```typescript
// Fresh booking with webhooks and workflows
const { mockRequestData, organizer, booker } = await setupFreshBookingTest({
  withWebhooks: true,
  withWorkflows: true
});

// Seated event with custom configuration
const { mockRequestData, organizer, booker } = await setupSeatedEventTest({
  seatsPerTimeSlot: 5,
  seatsShowAttendees: true,
  withWebhooks: true
});

// Round-robin team booking
const { mockRequestData, organizer, booker, teamMembers } = await setupRoundRobinTest({
  teamMembers: [
    { name: "Alice", email: "alice@example.com" },
    { name: "Bob", email: "bob@example.com" }
  ],
  withWebhooks: true
});
```

### Complete Test Example
```typescript
test("should create booking with webhooks", async ({ emails }) => {
  // Setup (1 line)
  const { mockRequestData, organizer, booker } = await setupFreshBookingTest({
    withWebhooks: true
  });
  
  // Execute (1 line)
  const booking = await handleNewBooking({ bookingData: mockRequestData });
  
  // Assert (1 line)
  await expectStandardBookingSuccess({
    createdBooking: booking,
    mockRequestData,
    organizer,
    booker,
    emails,
    withWebhook: true
  });
});
```

## For Advanced Users: Use Builder Classes

### Flexible, Chainable Configuration
```typescript
// Complex custom scenario with full control
const scenario = await TestScenarioBuilder.booking()
  .withUserData({ timeZone: "America/New_York" })
  .withEventTypeData({ length: 45, requiresConfirmation: true })
  .withExistingBookings(3)
  .withBookingLimits({ daily: 5 })
  .withWebhookSupport()
  .withWorkflowSupport()
  .withCalendarIntegration()
  .create();

// Team scenario with custom members
const teamScenario = await TestScenarioBuilder.team()
  .withTeamData({ name: "Engineering Team" })
  .withMembers(5)
  .withEventTypes()
  .create();

// Seated event with specific configuration
const seatedScenario = await TestScenarioBuilder.seatedEvent()
  .withSeats(10, true) // 10 seats, show attendees
  .withUserData({ timeZone: "Europe/London" })
  .create();
```

## When to Use Which

### Use Booking Scenario Helpers (90% of cases)
- ✅ Fresh booking tests
- ✅ Team booking tests  
- ✅ Seated event tests
- ✅ Round-robin tests
- ✅ Recurring event tests
- ✅ Standard webhook/workflow testing
- ✅ Quick prototyping
- ✅ Learning how to write tests

### Use Builder Classes (10% of cases)
- ✅ Complex custom scenarios
- ✅ Non-booking tests (user management, event types, etc.)
- ✅ Advanced configurations not covered by helpers
- ✅ Multiple existing bookings setup
- ✅ Custom booking limits testing
- ✅ Edge cases and unusual combinations

## Available Utilities

### Booking Scenario Helpers (Convenience Layer)
- `setupFreshBookingTest()` - Basic booking scenario
- `setupRescheduleTest()` - Rescheduling scenario  
- `setupTeamBookingTest()` - Team booking scenario
- `setupSeatedEventTest()` - Seated event scenario
- `setupRoundRobinTest()` - Round-robin scheduling
- `setupRecurringEventTest()` - Recurring event scenario

### Expectation Helpers
- `expectStandardBookingSuccess()` - Common booking assertions
- `expectSeatedBookingSuccess()` - Seated event assertions
- `expectRoundRobinBookingSuccess()` - Round-robin assertions
- `expectRecurringBookingSuccess()` - Recurring event assertions

### Builder Classes (Foundation Layer)
- `TestScenarioBuilder.booking()` - Booking scenario builder
- `TestScenarioBuilder.user()` - User scenario builder
- `TestScenarioBuilder.eventType()` - Event type builder
- `TestScenarioBuilder.team()` - Team scenario builder
- `TestScenarioBuilder.seatedEvent()` - Seated event builder
- `TestScenarioBuilder.roundRobin()` - Round-robin builder
- `TestScenarioBuilder.recurringEvent()` - Recurring event builder

### Low-Level Utilities (Foundation Layer)
- `createTestUser()`, `createTestEventType()`, `createTestBooking()`
- `createTestTeam()`, `createTestMembership()`, `createTestWebhook()`
- `createMockCalendarService()`, `createMockVideoService()`, etc.
- `expectBookingInDatabase()`, `expectUserInDatabase()`, etc.

## Migration Guide

### From Complex Setup to Simple Helpers
```typescript
// Before (50+ lines)
const organizer = getOrganizer({
  name: "Organizer",
  email: "organizer@example.com",
  id: 101,
  schedules: [TestData.schedules.IstWorkHours],
  credentials: [getGoogleCalendarCredential()],
  selectedCalendars: [TestData.selectedCalendars.google],
});

const scenarioData = getScenarioData({
  webhooks: [
    {
      userId: organizer.id,
      eventTriggers: ["BOOKING_CREATED"],
      subscriberUrl: "http://my-webhook.example.com",
      active: true,
      eventTypeId: 1,
      appId: null,
    },
  ],
  eventTypes: [
    {
      id: 1,
      slotInterval: 30,
      length: 30,
      users: [{ id: 101 }],
    },
  ],
  organizer,
  apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
});

await createBookingScenario(scenarioData);

// After (3 lines)
const { mockRequestData, organizer, booker } = await setupFreshBookingTest({
  withWebhooks: true,
  withIntegrations: true
});
```

### Progressive Learning Path
1. **Start with helpers**: Use `setupFreshBookingTest()` for basic tests
2. **Add complexity**: Use helper options like `withWebhooks`, `withWorkflows`
3. **Custom scenarios**: Move to builder classes when helpers aren't enough
4. **Advanced usage**: Use low-level utilities for maximum control

## Benefits

- **Beginner-friendly**: Write tests in 3-5 lines instead of 50+
- **Advanced flexibility**: Builder classes provide full control when needed
- **No duplication**: Convenience layer uses foundation utilities
- **Clear progression**: Start simple, move to advanced as needed
- **Backward compatibility**: All existing tests continue to work
- **Single source of truth**: Foundation layer provides consistent utilities
- **Maintainability**: Changes in one place benefit all tests
