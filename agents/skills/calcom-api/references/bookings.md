# Bookings API Reference

Detailed documentation for booking-related endpoints in the Cal.com API v2.

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/bookings | List bookings |
| POST | /v2/bookings | Create a booking |
| GET | /v2/bookings/{bookingUid} | Get a booking |
| POST | /v2/bookings/{bookingUid}/cancel | Cancel a booking |
| POST | /v2/bookings/{bookingUid}/reschedule | Reschedule a booking |
| POST | /v2/bookings/{bookingUid}/confirm | Confirm a pending booking |
| POST | /v2/bookings/{bookingUid}/decline | Decline a booking |
| PATCH | /v2/bookings/{bookingUid}/location | Update booking location |
| POST | /v2/bookings/{bookingUid}/mark-absent | Mark attendee as no-show |
| POST | /v2/bookings/{bookingUid}/reassign | Reassign booking to another host |
| GET | /v2/bookings/{bookingUid}/references | Get booking references |

## List Bookings

```http
GET /v2/bookings
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: `upcoming`, `recurring`, `past`, `cancelled`, `unconfirmed` |
| attendeeEmail | string | No | Filter by attendee email |
| attendeeName | string | No | Filter by attendee name |
| eventTypeId | number | No | Filter by event type ID |
| eventTypeIds | string | No | Comma-separated event type IDs |
| teamsIds | string | No | Comma-separated team IDs |
| afterStart | string | No | Filter bookings starting after this ISO 8601 date |
| beforeEnd | string | No | Filter bookings ending before this ISO 8601 date |
| sortStart | string | No | Sort by start time: `asc` or `desc` |
| sortEnd | string | No | Sort by end time: `asc` or `desc` |
| sortCreated | string | No | Sort by creation time: `asc` or `desc` |
| take | number | No | Number of results (default: 10, max: 250) |
| skip | number | No | Pagination offset |

### Response

```json
{
  "status": "success",
  "data": [
    {
      "id": 12345,
      "uid": "abc123def456",
      "title": "30 Minute Meeting",
      "description": "Discussion about project",
      "start": "2024-01-15T10:00:00.000Z",
      "end": "2024-01-15T10:30:00.000Z",
      "status": "accepted",
      "eventTypeId": 123,
      "attendees": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "timeZone": "America/New_York"
        }
      ],
      "hosts": [
        {
          "id": 456,
          "name": "Jane Smith",
          "email": "jane@company.com"
        }
      ],
      "location": "https://cal.com/video/abc123",
      "meetingUrl": "https://cal.com/video/abc123",
      "metadata": {},
      "createdAt": "2024-01-10T08:00:00.000Z"
    }
  ]
}
```

## Create a Booking

```http
POST /v2/bookings
```

### Request Body

```json
{
  "start": "2024-01-15T10:00:00Z",
  "eventTypeId": 123,
  "attendee": {
    "name": "John Doe",
    "email": "john@example.com",
    "timeZone": "America/New_York",
    "language": "en"
  },
  "guests": ["guest1@example.com", "guest2@example.com"],
  "meetingUrl": "https://cal.com/team/meeting",
  "metadata": {
    "customField": "value"
  },
  "bookingFieldsResponses": {
    "notes": "Please prepare the quarterly report"
  }
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| start | string | ISO 8601 booking start time |
| eventTypeId | number | ID of the event type to book |
| attendee.name | string | Attendee's full name |
| attendee.email | string | Attendee's email address |
| attendee.timeZone | string | Attendee's timezone (IANA format) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| attendee.language | string | Attendee's preferred language |
| guests | array | Additional guest email addresses |
| meetingUrl | string | Custom meeting URL |
| metadata | object | Custom metadata |
| bookingFieldsResponses | object | Responses to custom booking fields |

### Response

```json
{
  "status": "success",
  "data": {
    "id": 12345,
    "uid": "abc123def456",
    "title": "30 Minute Meeting",
    "start": "2024-01-15T10:00:00.000Z",
    "end": "2024-01-15T10:30:00.000Z",
    "status": "accepted",
    "eventTypeId": 123,
    "attendees": [...],
    "hosts": [...],
    "location": "https://cal.com/video/abc123"
  }
}
```

## Get a Booking

```http
GET /v2/bookings/{bookingUid}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| bookingUid | string | Unique booking identifier |

### Response

Returns the full booking object with all details.

## Cancel a Booking

```http
POST /v2/bookings/{bookingUid}/cancel
```

### Request Body

```json
{
  "cancellationReason": "Schedule conflict"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cancellationReason | string | No | Reason for cancellation |

## Reschedule a Booking

```http
POST /v2/bookings/{bookingUid}/reschedule
```

### Request Body

```json
{
  "start": "2024-01-16T14:00:00Z",
  "reschedulingReason": "Conflict with another meeting"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| start | string | Yes | New booking start time (ISO 8601) |
| reschedulingReason | string | No | Reason for rescheduling |

## Confirm a Booking

For event types that require confirmation:

```http
POST /v2/bookings/{bookingUid}/confirm
```

## Decline a Booking

```http
POST /v2/bookings/{bookingUid}/decline
```

### Request Body

```json
{
  "reason": "Not available at this time"
}
```

## Update Booking Location

```http
PATCH /v2/bookings/{bookingUid}/location
```

### Request Body

```json
{
  "location": "https://zoom.us/j/123456789"
}
```

## Mark Attendee as No-Show

```http
POST /v2/bookings/{bookingUid}/mark-absent
```

### Request Body

```json
{
  "attendeeEmail": "john@example.com",
  "noShow": true
}
```

## Reassign Booking

Reassign a booking to a different host:

```http
POST /v2/bookings/{bookingUid}/reassign
```

Or to a specific user:

```http
POST /v2/bookings/{bookingUid}/reassign/{userId}
```

## Get Booking References

Get external references (calendar events, video meetings) for a booking:

```http
GET /v2/bookings/{bookingUid}/references
```

### Response

```json
{
  "status": "success",
  "data": [
    {
      "type": "google_calendar",
      "uid": "calendar-event-id",
      "meetingUrl": "https://meet.google.com/abc-defg-hij"
    }
  ]
}
```

## Booking Statuses

| Status | Description |
|--------|-------------|
| accepted | Booking is confirmed |
| pending | Awaiting confirmation |
| cancelled | Booking was cancelled |
| rejected | Booking was declined |

## Common Use Cases

### Book a Meeting

1. Get available slots: `GET /v2/slots?eventTypeId=123&startTime=...&endTime=...`
2. Create booking: `POST /v2/bookings` with selected slot
3. Store the booking UID for future operations

### Reschedule Flow

1. Get new available slots: `GET /v2/slots?eventTypeId=123&startTime=...&endTime=...`
2. Reschedule: `POST /v2/bookings/{uid}/reschedule` with new start time

### Cancel with Notification

1. Cancel: `POST /v2/bookings/{uid}/cancel` with reason
2. Attendees automatically receive cancellation emails
