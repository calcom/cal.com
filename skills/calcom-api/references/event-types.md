# Event Types API Reference

Detailed documentation for event type endpoints in the Cal.com API v2.

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/event-types | List event types |
| POST | /v2/event-types | Create an event type |
| GET | /v2/event-types/{eventTypeId} | Get an event type |
| PATCH | /v2/event-types/{eventTypeId} | Update an event type |
| DELETE | /v2/event-types/{eventTypeId} | Delete an event type |

## List Event Types

```http
GET /v2/event-types
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| take | number | No | Number of results (default: 10, max: 250) |
| skip | number | No | Pagination offset |

### Response

```json
{
  "status": "success",
  "data": [
    {
      "id": 123,
      "title": "30 Minute Meeting",
      "slug": "30min",
      "description": "A quick 30 minute call",
      "lengthInMinutes": 30,
      "locations": [
        {
          "type": "integration",
          "integration": "cal-video"
        }
      ],
      "bookingFields": [],
      "disableGuests": false,
      "slotInterval": null,
      "minimumBookingNotice": 120,
      "beforeEventBuffer": 0,
      "afterEventBuffer": 0,
      "schedulingType": null,
      "metadata": {},
      "requiresConfirmation": false,
      "price": 0,
      "currency": "usd",
      "hidden": false
    }
  ]
}
```

## Create an Event Type

```http
POST /v2/event-types
```

### Request Body

```json
{
  "title": "30 Minute Meeting",
  "slug": "30min",
  "description": "A quick 30 minute call to discuss your needs",
  "lengthInMinutes": 30,
  "locations": [
    {
      "type": "integration",
      "integration": "cal-video"
    }
  ],
  "bookingFields": [
    {
      "type": "textarea",
      "name": "notes",
      "label": "Additional Notes",
      "required": false,
      "placeholder": "Any additional information..."
    }
  ],
  "disableGuests": false,
  "slotInterval": 15,
  "minimumBookingNotice": 120,
  "beforeEventBuffer": 5,
  "afterEventBuffer": 5,
  "scheduleId": 1,
  "requiresConfirmation": false,
  "hidden": false
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| title | string | Display name of the event type |
| slug | string | URL-friendly identifier |
| lengthInMinutes | number | Duration of the event |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| description | string | Description shown on booking page |
| locations | array | Meeting location options |
| bookingFields | array | Custom form fields |
| disableGuests | boolean | Prevent attendees from adding guests |
| slotInterval | number | Minutes between available slots |
| minimumBookingNotice | number | Minimum minutes before booking |
| beforeEventBuffer | number | Buffer time before event (minutes) |
| afterEventBuffer | number | Buffer time after event (minutes) |
| scheduleId | number | ID of schedule to use |
| requiresConfirmation | boolean | Require host confirmation |
| hidden | boolean | Hide from public profile |

## Location Types

### Cal Video (Built-in)

```json
{
  "type": "integration",
  "integration": "cal-video"
}
```

### Zoom

```json
{
  "type": "integration",
  "integration": "zoom"
}
```

### Google Meet

```json
{
  "type": "integration",
  "integration": "google-meet"
}
```

### Microsoft Teams

```json
{
  "type": "integration",
  "integration": "msteams"
}
```

### In-Person

```json
{
  "type": "address",
  "address": "123 Main St, City, Country"
}
```

### Phone Call (Host Calls)

```json
{
  "type": "userPhone"
}
```

### Phone Call (Attendee Provides)

```json
{
  "type": "attendeePhone"
}
```

### Custom Link

```json
{
  "type": "link",
  "link": "https://custom-meeting.com/room"
}
```

## Booking Fields

Custom form fields for collecting information from attendees.

### Text Field

```json
{
  "type": "text",
  "name": "company",
  "label": "Company Name",
  "required": true,
  "placeholder": "Enter your company name"
}
```

### Textarea

```json
{
  "type": "textarea",
  "name": "notes",
  "label": "Additional Notes",
  "required": false
}
```

### Select (Dropdown)

```json
{
  "type": "select",
  "name": "topic",
  "label": "Meeting Topic",
  "required": true,
  "options": [
    { "value": "sales", "label": "Sales Inquiry" },
    { "value": "support", "label": "Support" },
    { "value": "other", "label": "Other" }
  ]
}
```

### Radio Buttons

```json
{
  "type": "radio",
  "name": "preference",
  "label": "Preferred Contact Method",
  "required": true,
  "options": [
    { "value": "email", "label": "Email" },
    { "value": "phone", "label": "Phone" }
  ]
}
```

### Checkbox

```json
{
  "type": "checkbox",
  "name": "terms",
  "label": "I agree to the terms",
  "required": true
}
```

### Phone Number

```json
{
  "type": "phone",
  "name": "phone",
  "label": "Phone Number",
  "required": false
}
```

## Get an Event Type

```http
GET /v2/event-types/{eventTypeId}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventTypeId | number | Event type ID |

## Update an Event Type

```http
PATCH /v2/event-types/{eventTypeId}
```

### Request Body

Only include fields you want to update:

```json
{
  "title": "Updated Meeting Title",
  "lengthInMinutes": 45,
  "hidden": false
}
```

## Delete an Event Type

```http
DELETE /v2/event-types/{eventTypeId}
```

## Team Event Types

For team event types, use the team-scoped endpoints:

### List Team Event Types

```http
GET /v2/teams/{teamId}/event-types
```

### Create Team Event Type

```http
POST /v2/teams/{teamId}/event-types
```

Additional fields for team event types:

```json
{
  "title": "Team Meeting",
  "slug": "team-meeting",
  "lengthInMinutes": 30,
  "schedulingType": "ROUND_ROBIN",
  "hosts": [
    { "userId": 1, "isFixed": false },
    { "userId": 2, "isFixed": false }
  ]
}
```

### Scheduling Types

| Type | Description |
|------|-------------|
| ROUND_ROBIN | Distributes bookings among team members |
| COLLECTIVE | All team members must attend |
| MANAGED | Parent event type that creates child event types |

## Private Links

Create private booking links that bypass public visibility:

### List Private Links

```http
GET /v2/event-types/{eventTypeId}/private-links
```

### Create Private Link

```http
POST /v2/event-types/{eventTypeId}/private-links
```

## Event Type Webhooks

Configure webhooks specific to an event type:

### List Event Type Webhooks

```http
GET /v2/event-types/{eventTypeId}/webhooks
```

### Create Event Type Webhook

```http
POST /v2/event-types/{eventTypeId}/webhooks
```

```json
{
  "subscriberUrl": "https://your-app.com/webhook",
  "triggers": ["BOOKING_CREATED"],
  "active": true
}
```
