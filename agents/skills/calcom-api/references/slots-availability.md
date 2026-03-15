# Slots and Availability API Reference

Detailed documentation for checking availability and managing slots in the Cal.com API v2.

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/slots | Get available time slots |
| POST | /v2/slots/reservations | Reserve a slot temporarily |
| DELETE | /v2/slots/reservations/{uid} | Release a reserved slot |
| GET | /v2/calendars/busy-times | Get busy times from calendars |

## Get Available Slots

Check available time slots for booking an event type.

```http
GET /v2/slots
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startTime | string | Yes | ISO 8601 start of date range |
| endTime | string | Yes | ISO 8601 end of date range |
| eventTypeId | number | Conditional | Event type ID (required if no slug) |
| eventTypeSlug | string | Conditional | Event type slug (required if no ID) |
| usernameList | string | Conditional | Comma-separated usernames for team events |
| timeZone | string | No | Timezone for slot display (default: UTC) |
| duration | number | No | Override event duration in minutes |
| rescheduleUid | string | No | Booking UID if rescheduling |

### Example Request

```http
GET /v2/slots?startTime=2024-01-15T00:00:00Z&endTime=2024-01-22T00:00:00Z&eventTypeId=123&timeZone=America/New_York
```

### Response

```json
{
  "status": "success",
  "data": {
    "slots": {
      "2024-01-15": [
        {
          "time": "2024-01-15T09:00:00.000Z"
        },
        {
          "time": "2024-01-15T09:30:00.000Z"
        },
        {
          "time": "2024-01-15T10:00:00.000Z"
        }
      ],
      "2024-01-16": [
        {
          "time": "2024-01-16T09:00:00.000Z"
        }
      ]
    }
  }
}
```

### Response with Attendees (Seated Events)

For event types with `seatsPerTimeSlot` configured:

```json
{
  "status": "success",
  "data": {
    "slots": {
      "2024-01-15": [
        {
          "time": "2024-01-15T09:00:00.000Z",
          "attendees": 3,
          "seatsAvailable": 7
        }
      ]
    }
  }
}
```

## Reserve a Slot

Temporarily reserve a slot while the user completes the booking form. This prevents double-booking.

```http
POST /v2/slots/reservations
```

### Request Body

```json
{
  "eventTypeId": 123,
  "slotUtcStartDate": "2024-01-15T09:00:00.000Z",
  "slotUtcEndDate": "2024-01-15T09:30:00.000Z"
}
```

### Response

```json
{
  "status": "success",
  "data": {
    "uid": "reservation-uid-123",
    "eventTypeId": 123,
    "slotUtcStartDate": "2024-01-15T09:00:00.000Z",
    "slotUtcEndDate": "2024-01-15T09:30:00.000Z",
    "expiresAt": "2024-01-15T08:10:00.000Z"
  }
}
```

Reservations automatically expire after a short period (typically 10 minutes).

## Release a Reserved Slot

Release a slot reservation if the user abandons the booking flow.

```http
DELETE /v2/slots/reservations/{uid}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| uid | string | Reservation UID |

## Get Busy Times

Check busy times from connected calendars.

```http
GET /v2/calendars/busy-times
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startTime | string | Yes | ISO 8601 start of date range |
| endTime | string | Yes | ISO 8601 end of date range |
| loggedInUsersTz | string | No | User's timezone |
| credentialId | number | No | Specific calendar credential ID |

### Response

```json
{
  "status": "success",
  "data": [
    {
      "start": "2024-01-15T10:00:00.000Z",
      "end": "2024-01-15T11:00:00.000Z",
      "title": "Existing Meeting",
      "source": "google_calendar"
    }
  ]
}
```

## Routing Form Slots

For routing forms that direct to different event types:

```http
POST /v2/routing-forms/{routingFormId}/calculate-slots
```

### Request Body

```json
{
  "startTime": "2024-01-15T00:00:00Z",
  "endTime": "2024-01-22T00:00:00Z",
  "timeZone": "America/New_York",
  "responses": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

## Understanding Slot Availability

Slots are calculated based on:

1. **User's Schedule**: Working hours defined in their schedule
2. **Existing Bookings**: Times already booked
3. **Calendar Busy Times**: Events from connected calendars
4. **Buffer Times**: Before/after event buffers
5. **Minimum Notice**: Minimum booking notice period
6. **Booking Limits**: Daily/weekly/monthly booking limits

## Best Practices

### Efficient Slot Fetching

1. **Limit date range**: Request only the dates you need to display
2. **Cache results**: Slots don't change frequently, cache for short periods
3. **Use timezone parameter**: Request slots in user's timezone to avoid conversion

### Preventing Double Bookings

1. **Reserve slots**: Use slot reservations for multi-step booking flows
2. **Handle expiration**: Reservations expire - handle gracefully
3. **Verify before booking**: Always verify slot is still available before creating booking

### Example Booking Flow

```
1. User selects date range
   GET /v2/slots?startTime=...&endTime=...&eventTypeId=123

2. User selects a slot
   POST /v2/slots/reservations
   {
     "eventTypeId": 123,
     "slotUtcStartDate": "2024-01-15T09:00:00Z",
     "slotUtcEndDate": "2024-01-15T09:30:00Z"
   }

3. User fills booking form

4. Create booking
   POST /v2/bookings
   {
     "start": "2024-01-15T09:00:00Z",
     "eventTypeId": 123,
     "attendee": {...}
   }

5. If user abandons, release reservation
   DELETE /v2/slots/reservations/{uid}
```

## Timezone Handling

All times in the API are in UTC (ISO 8601 format). Use the `timeZone` parameter to receive slots in a specific timezone for display purposes.

```http
GET /v2/slots?startTime=2024-01-15T00:00:00Z&endTime=2024-01-22T00:00:00Z&eventTypeId=123&timeZone=Europe/London
```

The response times will still be in UTC, but the slot calculation will respect the user's timezone for determining available hours.
