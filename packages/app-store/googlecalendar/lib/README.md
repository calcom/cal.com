# Google Calendar Service - Availability Batching

## Overview

The Google Calendar `CalendarService` implements an optimized strategy for fetching calendar availability, efficiently handling Google Calendar API limitations.

## How It Works

### Main Availability Flow

The `getAvailability()` method is the main entry point for fetching busy times from user calendars:

```typescript
async getAvailability(
  dateFrom: string,
  dateTo: string,
  selectedCalendars: IntegrationCalendar[],
  fallbackToPrimary?: boolean
): Promise<EventBusyDate[]>
```

#### Process Steps:

1. **Calendar Filtering**: Filters only `google_calendar` type calendars from the selected calendars list

2. **Early Return**: If no Google calendars are selected (only other integrations), returns an empty array immediately

3. **ID Retrieval**: Calls `getCalendarIds()` to get the calendar IDs to be queried

4. **Data Fetching**: Calls `fetchAvailabilityData()` to fetch busy times

### Primary Calendar Fallback Logic

The `getCalendarIds()` method implements the fallback logic:

```typescript
private async getCalendarIds(
  selectedCalendarIds: string[],
  fallbackToPrimary?: boolean
): Promise<string[]>
```

- If there are selected calendars, returns those IDs directly
- If there are no selected calendars and `fallbackToPrimary` is `true`, returns only the primary calendar
- If there are no selected calendars and `fallbackToPrimary` is `false`, returns all valid calendars

### 90-Day Period Batching

The Google Calendar API has a **90-day** limitation for FreeBusy queries. The `fetchAvailabilityData()` method handles this automatically:

```typescript
private async fetchAvailabilityData(
  calendarIds: string[],
  dateFrom: string,
  dateTo: string
): Promise<EventBusyDate[]>
```

#### Chunking Logic:

1. **Difference Calculation**: Calculates the difference in days between `dateFrom` and `dateTo`

2. **Period <= 90 days**: Makes a single call to the FreeBusy API

3. **Period > 90 days**: Splits into 90-day chunks and makes multiple calls:
   - Calculates the number of loops needed: `Math.ceil(diff / 90)`
   - For each chunk, adjusts `timeMin` and `timeMax`
   - Adds 1 minute between chunks to avoid overlap
   - Concatenates all results into a single array

### Chunking Example

For a 200-day period:
- **Chunk 1**: Days 1-90
- **Chunk 2**: Days 90-180
- **Chunk 3**: Days 180-200

## Helper Methods

### `getFreeBusyData()`

Makes the actual call to the Google FreeBusy API and transforms the response:

```typescript
async getFreeBusyData(args: FreeBusyArgs): Promise<(EventBusyDate & { id: string })[] | null>
```

### `convertFreeBusyToEventBusyDates()`

Converts the FreeBusy API response to the `EventBusyDate[]` format:

```typescript
private convertFreeBusyToEventBusyDates(
  freeBusyResult: calendar_v3.Schema$FreeBusyResponse
): EventBusyDate[]
```

### `getAvailabilityWithTimeZones()`

Alternative version that includes timezone information in the results:

```typescript
async getAvailabilityWithTimeZones(
  dateFrom: string,
  dateTo: string,
  selectedCalendars: IntegrationCalendar[],
  fallbackToPrimary?: boolean
): Promise<{ start: Date | string; end: Date | string; timeZone: string }[]>
```

## Data Structures

### FreeBusyArgs

```typescript
type FreeBusyArgs = {
  timeMin: string;
  timeMax: string;
  items: { id: string }[];
};
```

### EventBusyDate

```typescript
type EventBusyDate = {
  start: string;
  end: string;
};
```

## Performance Considerations

1. **Native Date Calculation**: Uses native `Date` instead of libraries like `dayjs` for better performance

2. **Calendar Pagination**: The `getAllCalendars()` method uses pagination with `maxResults: 250` (maximum allowed by the API)

3. **Sequential Processing**: Each 90-day chunk is processed sequentially to avoid rate limiting

## Error Handling

- Errors are logged with full context using `safeStringify`
- Exceptions are propagated to the caller for proper handling
- If the API returns `null`, an exception is thrown with a descriptive message

## Delegation Credentials Integration

The service supports delegation credentials through the `delegationCredentialId` field in selected calendars. This allows domain administrators to access calendars of other users in the organization.

Authentication is managed by the `CalendarAuth` class, which handles OAuth tokens and automatic refresh.
