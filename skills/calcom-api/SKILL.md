---
name: calcom-api
description: Interact with the Cal.com API v2 to manage scheduling, bookings, event types, availability, and calendars. Use this skill when building integrations that need to create or manage bookings, check availability, configure event types, or sync calendars with Cal.com's scheduling infrastructure.
license: MIT
metadata:
  author: calcom
  version: "1.0.0"
  api-version: "v2"
---

# Cal.com API v2

This skill provides guidance for AI agents to interact with the Cal.com API v2, enabling scheduling automation, booking management, and calendar integrations.

## Base URL

All API requests should be made to:
```
https://api.cal.com/v2
```

## Authentication

All API requests require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer cal_<your_api_key>
```

API keys must be prefixed with `cal_`. You can generate API keys from your Cal.com dashboard under Settings > Developer > API Keys.

## Core Concepts

### Event Types
Event types define bookable meeting configurations (duration, location, availability rules). Each event type has a unique slug used in booking URLs.

### Bookings
Bookings are confirmed appointments created when someone books an event type. Each booking has a unique UID for identification.

### Schedules
Schedules define when a user is available for bookings. Users can have multiple schedules with different working hours.

### Slots
Slots represent available time windows that can be booked based on event type configuration and user availability.

## Common Operations

### Check Available Slots

Before creating a booking, check available time slots:

```http
GET /v2/slots?startTime=2024-01-15T00:00:00Z&endTime=2024-01-22T00:00:00Z&eventTypeId=123&eventTypeSlug=30min
```

Query parameters:
- `startTime` (required): ISO 8601 start of range
- `endTime` (required): ISO 8601 end of range  
- `eventTypeId` or `eventTypeSlug`: Identify the event type
- `timeZone`: Timezone for slot display (default: UTC)

Response contains available slots grouped by date.

### Create a Booking

```http
POST /v2/bookings
Content-Type: application/json

{
  "start": "2024-01-15T10:00:00Z",
  "eventTypeId": 123,
  "attendee": {
    "name": "John Doe",
    "email": "john@example.com",
    "timeZone": "America/New_York"
  },
  "meetingUrl": "https://cal.com/team/meeting",
  "metadata": {}
}
```

Required fields:
- `start`: ISO 8601 booking start time
- `eventTypeId`: ID of the event type to book
- `attendee.name`: Attendee's full name
- `attendee.email`: Attendee's email address
- `attendee.timeZone`: Attendee's timezone

### Get Bookings

List bookings with optional filters:

```http
GET /v2/bookings?status=upcoming&take=10
```

Query parameters:
- `status`: Filter by status (upcoming, recurring, past, cancelled, unconfirmed)
- `attendeeEmail`: Filter by attendee email
- `eventTypeId`: Filter by event type
- `take`: Number of results (max 250)
- `skip`: Pagination offset

### Get a Single Booking

```http
GET /v2/bookings/{bookingUid}
```

### Cancel a Booking

```http
POST /v2/bookings/{bookingUid}/cancel
Content-Type: application/json

{
  "cancellationReason": "Schedule conflict"
}
```

### Reschedule a Booking

```http
POST /v2/bookings/{bookingUid}/reschedule
Content-Type: application/json

{
  "start": "2024-01-16T14:00:00Z",
  "reschedulingReason": "Conflict with another meeting"
}
```

### List Event Types

```http
GET /v2/event-types
```

Returns all event types for the authenticated user.

### Get a Single Event Type

```http
GET /v2/event-types/{eventTypeId}
```

### Create an Event Type

```http
POST /v2/event-types
Content-Type: application/json

{
  "title": "30 Minute Meeting",
  "slug": "30min",
  "lengthInMinutes": 30,
  "locations": [
    {
      "type": "integration",
      "integration": "cal-video"
    }
  ]
}
```

### List Schedules

```http
GET /v2/schedules
```

### Get Default Schedule

```http
GET /v2/schedules/default
```

### Create a Schedule

```http
POST /v2/schedules
Content-Type: application/json

{
  "name": "Working Hours",
  "timeZone": "America/New_York",
  "isDefault": true,
  "availability": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

Days are 0-indexed (0 = Sunday, 1 = Monday, etc.).

### Get Current User

```http
GET /v2/me
```

Returns the authenticated user's profile information.

## Team and Organization Endpoints

For team bookings and organization management, use the organization-scoped endpoints:

### List Organization Teams

```http
GET /v2/organizations/{orgId}/teams
```

### Get Team Event Types

```http
GET /v2/organizations/{orgId}/teams/{teamId}/event-types
```

### Create Team Booking

Team event types support different scheduling modes:
- `COLLECTIVE`: All team members must attend
- `ROUND_ROBIN`: Distributes bookings among team members

## Webhooks

Configure webhooks to receive real-time notifications:

### List Webhooks

```http
GET /v2/webhooks
```

### Create a Webhook

```http
POST /v2/webhooks
Content-Type: application/json

{
  "subscriberUrl": "https://your-app.com/webhook",
  "triggers": ["BOOKING_CREATED", "BOOKING_CANCELLED"],
  "active": true
}
```

Available triggers:
- `BOOKING_CREATED`
- `BOOKING_CANCELLED`
- `BOOKING_RESCHEDULED`
- `BOOKING_CONFIRMED`
- `MEETING_STARTED`
- `MEETING_ENDED`

## Calendar Integration

### List Connected Calendars

```http
GET /v2/calendars
```

### Check Busy Times

```http
GET /v2/calendars/busy-times?startTime=2024-01-15T00:00:00Z&endTime=2024-01-22T00:00:00Z
```

## Error Handling

The API returns standard HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid or missing API key)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `422`: Unprocessable Entity (validation error)
- `500`: Internal Server Error

Error responses include a message field:

```json
{
  "status": "error",
  "message": "Booking not found"
}
```

## Rate Limiting

The API implements rate limiting. If you exceed the limit, you'll receive a `429 Too Many Requests` response. Implement exponential backoff for retries.

## Pagination

List endpoints support pagination via `take` and `skip` parameters:

- `take`: Number of items to return (default: 10, max: 250)
- `skip`: Number of items to skip

## Best Practices

1. Always check slot availability before creating bookings
2. Store booking UIDs for future reference (cancel, reschedule)
3. Handle timezone conversions carefully - always use ISO 8601 format
4. Implement webhook handlers for real-time booking updates
5. Cache event type data to reduce API calls
6. Use appropriate error handling for all API calls

## Additional Resources

- [Full API Reference](https://cal.com/docs/api-reference/v2)
- [OpenAPI Specification](https://api.cal.com/v2/docs)
