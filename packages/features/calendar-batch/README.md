# Calendar Batch Feature

## Overview

The Calendar Batch feature optimizes Google Calendar availability queries by intelligently batching FreeBusy API calls based on delegation credentials. This reduces the number of API calls while respecting Google's API limits.

## Architecture

### Components

#### 1. CalendarBatchService

Location: `lib/CalendarBatchService.ts`

A simple utility class that determines which calendar types support batching optimization.

```typescript
class CalendarBatchService {
  static isCalendarTypeSupported(type: string | null): boolean
}
```

Currently, only `google_calendar` is supported. This gate is used by `getCalendar()` to decide whether to wrap the calendar service with batching capabilities.

#### 2. CalendarBatchWrapper

Location: `lib/CalendarBatchWrapper.ts`

A decorator that wraps the original calendar service and optimizes availability queries. It implements the `Calendar` interface, passing through most methods directly to the underlying calendar while intercepting `getAvailability()` and `getAvailabilityWithTimeZones()` for optimization.

**Key Constants:**
- `CALENDAR_BATCH_MAX_SIZE = 50`: Google Calendar FreeBusy API limit for items per request

**Key Methods:**

##### `splitCalendars(selectedCalendars)`

Divides calendars into two groups based on their credential type:

1. **ownCredentials**: Calendars WITHOUT `delegationCredentialId`
   - These are processed one-by-one because each may represent a different OAuth token
   - Conservative approach to avoid mixing credentials

2. **delegatedCredentials**: Calendars WITH `delegationCredentialId`
   - Grouped by their `delegationCredentialId`
   - Calendars in the same group share the same delegated credential and can be safely batched together

##### `partition(items, size)`

Splits an array into chunks of the specified size (50 for Google API compliance).

##### `getAvailability(dateFrom, dateTo, selectedCalendars, fallbackToPrimary)`

The main optimization method:

1. Splits calendars using `splitCalendars()`
2. Creates parallel tasks:
   - One task per own credential calendar (processed individually)
   - For delegated credentials: groups by `delegationCredentialId`, partitions each group into batches of 50, creates one task per batch
3. Executes all tasks in parallel with `Promise.all()`
4. Flattens and returns combined results

**Edge Case:** If no calendars are provided, a single call is made with an empty array to honor `fallbackToPrimary`.

### Integration with getCalendar

Location: `packages/app-store/_utils/getCalendar.ts`

The `getCalendar()` factory function decides which wrapper to use:

```
Decision Flow:
1. Create original calendar service from CalendarServiceMap
2. Check if CalendarCacheWrapper should be used (feature flag based)
   - If yes, return CalendarCacheWrapper (cache takes precedence)
3. Check if CalendarBatchService.isCalendarTypeSupported(calendarType)
   - If yes, return CalendarBatchWrapper
4. Otherwise, return unoptimized original calendar
```

**Important:** Cache wrapper takes precedence over batch wrapper. If calendar caching is enabled for a user, batching is not applied.

## How It Works with Google Calendar

### Two Levels of Chunking

The system has two independent chunking mechanisms:

1. **CalendarBatchWrapper (this feature)**: Chunks calendars into groups of 50 per API call based on delegation credentials

2. **GoogleCalendarService.fetchAvailabilityData()**: Chunks time periods into 90-day windows (Google FreeBusy API limitation)

This means a single `getAvailability()` call can result in multiple Google API calls:
- Multiple calls for different credential groups (batch wrapper)
- Multiple calls for long date ranges > 90 days (Google service)

### Example Flow

For a user with:
- 2 personal calendars (no delegation)
- 75 delegated calendars under delegation credential "A"
- 30 delegated calendars under delegation credential "B"

The batch wrapper creates:
- 2 tasks for personal calendars (one each)
- 2 tasks for delegation "A" (50 + 25 calendars)
- 1 task for delegation "B" (30 calendars)

Total: 5 parallel API calls instead of 107 sequential calls.

## Data Model

### IntegrationCalendar

The `IntegrationCalendar` interface extends `SelectedCalendar` from Prisma and includes:

- `externalId`: The calendar's external identifier
- `credentialId`: Reference to the Credential used
- `delegationCredentialId`: Reference to a DelegationCredential (if using domain-wide delegation)

### DelegationCredential

A `DelegationCredential` represents a shared credential that allows accessing multiple users' calendars within an organization (e.g., Google Workspace domain-wide delegation). Calendars sharing the same `delegationCredentialId` can be batched together because they use the same authentication context.

## Performance Considerations

1. **Parallel Execution**: All batched tasks run in parallel via `Promise.all()`

2. **Conservative Batching**: Own credentials are never batched together to avoid potential token mixing issues

3. **Respects API Limits**: Never exceeds 50 calendars per FreeBusy request

4. **Pass-through for Non-Availability Methods**: `createEvent`, `updateEvent`, `deleteEvent`, and other methods are not batched - they pass directly to the underlying calendar service

## Supported Calendar Types

Currently only `google_calendar` supports batching. To add support for other calendar types, update `CalendarBatchService.isCalendarTypeSupported()`.
