# Refactored Test Utilities

This directory contains refactored test utilities that make Cal.com tests more maintainable and beginner-friendly while preserving exact test behavior.

## Key Improvements

- **Builder Patterns**: Extend existing builders with sensible defaults
- **Scenario Templates**: Pre-configured scenarios for common test patterns
- **Mock Factories**: Standardized mock creation with override options
- **Test Helpers**: High-level utilities that combine setup, mocking, and expectations

## Quick Start

### Before (Old Pattern)
```typescript
const booker = getBooker({ email: "booker@example.com", name: "Booker" });
const organizer = getOrganizer({
  name: "Organizer",
  email: "organizer@example.com", 
  id: 101,
  schedules: [TestData.schedules.IstWorkHours],
  credentials: [getGoogleCalendarCredential()],
  selectedCalendars: [TestData.selectedCalendars.google],
});

await createBookingScenario(getScenarioData({
  webhooks: [{ userId: organizer.id, eventTriggers: ["BOOKING_CREATED"], ... }],
  eventTypes: [{ id: 1, slotInterval: 30, length: 30, users: [{ id: 101 }] }],
  organizer,
  apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
}));

mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo", ... });
const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", { ... });
const mockBookingData = getMockRequestDataForBooking({ ... });
```

### After (New Pattern)
```typescript
const { mocks, mockRequestData, organizer, booker } = await setupFreshBookingTest({
  withWebhooks: true,
  withWorkflows: true,
});
```

## Available Utilities

### Scenario Templates
- `createFreshBookingScenario()` - Standard new booking scenario
- `createRescheduleScenario()` - Booking reschedule scenario  
- `createTeamBookingScenario()` - Team/collective booking scenario

### Test Helpers
- `setupFreshBookingTest()` - Complete setup for fresh booking tests
- `setupRescheduleTest()` - Complete setup for reschedule tests
- `setupTeamBookingTest()` - Complete setup for team booking tests
- `expectStandardBookingSuccess()` - Standard success expectations

### Mock Factories
- `createStandardCalendarMock()` - Standard calendar mock with defaults
- `createStandardVideoMock()` - Standard video mock with defaults
- `createBookingMocks()` - Combined mocks for different scenarios

## Migration Guide

1. Import new utilities: `import { setupFreshBookingTest } from "@calcom/web/test/utils/bookingScenario"`
2. Replace manual setup with helper functions
3. Use scenario templates for common patterns
4. Leverage expectation helpers for standard checks
5. Gradually migrate existing tests as needed

## Backward Compatibility

All existing utilities remain available and unchanged. New utilities are additive and don't break existing tests.
