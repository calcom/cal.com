# Calendars API Reference

Detailed documentation for calendar integration endpoints in the Cal.com API v2.

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/calendars | List connected calendars |
| GET | /v2/calendars/busy-times | Get busy times |
| GET | /v2/calendars/{calendar}/check | Check calendar connection |
| POST | /v2/calendars/{calendar}/connect | Connect a calendar |
| DELETE | /v2/calendars/{calendar}/disconnect | Disconnect a calendar |
| GET | /v2/calendars/{calendar}/credentials | Get calendar credentials |
| GET | /v2/destination-calendars | List destination calendars |
| GET | /v2/selected-calendars | List selected calendars |

## List Connected Calendars

```http
GET /v2/calendars
```

### Response

```json
{
  "status": "success",
  "data": {
    "connectedCalendars": [
      {
        "integration": {
          "type": "google_calendar",
          "title": "Google Calendar",
          "slug": "google-calendar"
        },
        "credentialId": 123,
        "primary": {
          "externalId": "primary",
          "name": "john@gmail.com",
          "email": "john@gmail.com",
          "isSelected": true,
          "readOnly": false
        },
        "calendars": [
          {
            "externalId": "primary",
            "name": "john@gmail.com",
            "email": "john@gmail.com",
            "isSelected": true,
            "readOnly": false
          },
          {
            "externalId": "calendar-id-2",
            "name": "Work Calendar",
            "email": "john@gmail.com",
            "isSelected": true,
            "readOnly": false
          }
        ]
      }
    ],
    "destinationCalendar": {
      "id": 1,
      "integration": "google_calendar",
      "externalId": "primary",
      "name": "john@gmail.com"
    }
  }
}
```

## Get Busy Times

Check busy times from connected calendars to understand availability.

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

### Example Request

```http
GET /v2/calendars/busy-times?startTime=2024-01-15T00:00:00Z&endTime=2024-01-22T00:00:00Z&loggedInUsersTz=America/New_York
```

### Response

```json
{
  "status": "success",
  "data": [
    {
      "start": "2024-01-15T10:00:00.000Z",
      "end": "2024-01-15T11:00:00.000Z",
      "title": "Team Meeting",
      "source": "google_calendar"
    },
    {
      "start": "2024-01-16T14:00:00.000Z",
      "end": "2024-01-16T15:00:00.000Z",
      "title": "Client Call",
      "source": "google_calendar"
    }
  ]
}
```

## Calendar Connection

### Check Calendar Connection

```http
GET /v2/calendars/{calendar}/check
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| calendar | string | Calendar type (e.g., `google-calendar`, `office365-calendar`) |

### Connect a Calendar

```http
POST /v2/calendars/{calendar}/connect
```

This initiates the OAuth flow for calendar connection.

### Disconnect a Calendar

```http
DELETE /v2/calendars/{calendar}/disconnect
```

## Supported Calendar Types

| Type | Slug | Description |
|------|------|-------------|
| Google Calendar | google-calendar | Google Workspace calendars |
| Microsoft 365 | office365-calendar | Outlook/Microsoft 365 calendars |
| Apple Calendar | apple-calendar | iCloud calendars (CalDAV) |
| CalDAV | caldav-calendar | Generic CalDAV calendars |

## Destination Calendars

The destination calendar is where new bookings are created.

### List Destination Calendars

```http
GET /v2/destination-calendars
```

### Response

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "integration": "google_calendar",
      "externalId": "primary",
      "name": "john@gmail.com",
      "userId": 123,
      "eventTypeId": null,
      "credentialId": 456
    }
  ]
}
```

## Selected Calendars

Selected calendars are checked for conflicts when calculating availability.

### List Selected Calendars

```http
GET /v2/selected-calendars
```

### Response

```json
{
  "status": "success",
  "data": [
    {
      "integration": "google_calendar",
      "externalId": "primary",
      "credentialId": 123
    },
    {
      "integration": "google_calendar",
      "externalId": "work-calendar-id",
      "credentialId": 123
    }
  ]
}
```

## ICS Feed

### Check ICS Feed

```http
GET /v2/calendars/ics-feed/check
```

### Save ICS Feed

```http
POST /v2/calendars/ics-feed/save
```

```json
{
  "url": "https://calendar.example.com/feed.ics"
}
```

## Calendar Events

### Get Calendar Event

```http
GET /v2/calendars/{calendar}/events/{eventUid}
```

### Response

```json
{
  "status": "success",
  "data": {
    "id": "event-id-123",
    "title": "Meeting",
    "description": "Discussion",
    "start": {
      "time": "2024-01-15T10:00:00.000Z",
      "timeZone": "America/New_York"
    },
    "end": {
      "time": "2024-01-15T11:00:00.000Z",
      "timeZone": "America/New_York"
    },
    "attendees": [
      {
        "email": "attendee@example.com",
        "name": "Attendee Name",
        "responseStatus": "accepted"
      }
    ],
    "status": "accepted",
    "source": "google"
  }
}
```

## Understanding Calendar Integration

### How Calendars Affect Availability

1. **Selected Calendars**: Events from selected calendars block availability
2. **Destination Calendar**: New bookings are created in this calendar
3. **Busy Times**: The API aggregates busy times from all selected calendars

### Calendar Sync Flow

```
1. User connects calendar (OAuth)
   POST /v2/calendars/google-calendar/connect

2. User selects which calendars to check for conflicts
   (Done via Cal.com dashboard)

3. User sets destination calendar for new bookings
   (Done via Cal.com dashboard)

4. When checking slots:
   - API fetches busy times from all selected calendars
   - Busy times are excluded from available slots

5. When booking is created:
   - Event is created in destination calendar
   - Confirmation emails sent to attendees
```

### Cal.com Event Identification

Cal.com events in external calendars can be identified by their iCalUID ending with `@Cal.com` (e.g., `2GBXSdEixretciJfKVmYN8@Cal.com`).

## Team Calendar Integration

For team-level calendar management:

### Team Conferencing

```http
GET /v2/organizations/{orgId}/teams/{teamId}/conferencing
```

### Connect Team Calendar

```http
POST /v2/organizations/{orgId}/teams/{teamId}/conferencing/{app}/connect
```

## Best Practices

1. **Check connection status**: Verify calendar is connected before operations
2. **Handle OAuth expiry**: Calendar tokens may expire, handle re-authentication
3. **Respect rate limits**: Calendar APIs have their own rate limits
4. **Cache busy times**: Busy times don't change frequently, cache appropriately
5. **Use webhooks**: Subscribe to booking events instead of polling calendars
