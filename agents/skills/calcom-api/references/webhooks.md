# Webhooks API Reference

Detailed documentation for webhook management endpoints in the Cal.com API v2.

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/webhooks | List webhooks |
| POST | /v2/webhooks | Create a webhook |
| GET | /v2/webhooks/{webhookId} | Get a webhook |
| PATCH | /v2/webhooks/{webhookId} | Update a webhook |
| DELETE | /v2/webhooks/{webhookId} | Delete a webhook |

## List Webhooks

```http
GET /v2/webhooks
```

### Response

```json
{
  "status": "success",
  "data": [
    {
      "id": "webhook-id-123",
      "subscriberUrl": "https://your-app.com/webhook",
      "triggers": ["BOOKING_CREATED", "BOOKING_CANCELLED"],
      "active": true,
      "payloadTemplate": null,
      "secret": "whsec_..."
    }
  ]
}
```

## Create a Webhook

```http
POST /v2/webhooks
```

### Request Body

```json
{
  "subscriberUrl": "https://your-app.com/webhook",
  "triggers": ["BOOKING_CREATED", "BOOKING_CANCELLED", "BOOKING_RESCHEDULED"],
  "active": true,
  "payloadTemplate": null,
  "secret": "your-webhook-secret"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| subscriberUrl | string | Yes | URL to receive webhook payloads |
| triggers | array | Yes | Events that trigger the webhook |
| active | boolean | No | Enable/disable webhook (default: true) |
| payloadTemplate | string | No | Custom payload template |
| secret | string | No | Secret for signature verification |

## Webhook Triggers

| Trigger | Description |
|---------|-------------|
| BOOKING_CREATED | New booking created |
| BOOKING_CANCELLED | Booking cancelled |
| BOOKING_RESCHEDULED | Booking rescheduled |
| BOOKING_CONFIRMED | Pending booking confirmed |
| BOOKING_REJECTED | Booking rejected |
| BOOKING_REQUESTED | Booking request received (requires confirmation) |
| BOOKING_PAYMENT_INITIATED | Payment started |
| BOOKING_NO_SHOW_UPDATED | Attendee marked as no-show |
| MEETING_STARTED | Video meeting started |
| MEETING_ENDED | Video meeting ended |
| RECORDING_READY | Meeting recording available |
| INSTANT_MEETING | Instant meeting created |
| RECORDING_TRANSCRIPTION_GENERATED | Transcription ready |
| FORM_SUBMITTED | Routing form submitted |

## Webhook Payload

### BOOKING_CREATED Payload

```json
{
  "triggerEvent": "BOOKING_CREATED",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "payload": {
    "type": "30min",
    "title": "30 Minute Meeting",
    "description": "Meeting description",
    "startTime": "2024-01-15T10:00:00.000Z",
    "endTime": "2024-01-15T10:30:00.000Z",
    "organizer": {
      "id": 123,
      "name": "Jane Smith",
      "email": "jane@company.com",
      "timeZone": "America/New_York"
    },
    "attendees": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "timeZone": "America/New_York"
      }
    ],
    "location": "https://cal.com/video/abc123",
    "destinationCalendar": {
      "integration": "google_calendar",
      "externalId": "calendar-id"
    },
    "uid": "booking-uid-123",
    "metadata": {},
    "responses": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### BOOKING_CANCELLED Payload

```json
{
  "triggerEvent": "BOOKING_CANCELLED",
  "createdAt": "2024-01-15T12:00:00.000Z",
  "payload": {
    "uid": "booking-uid-123",
    "title": "30 Minute Meeting",
    "startTime": "2024-01-15T10:00:00.000Z",
    "endTime": "2024-01-15T10:30:00.000Z",
    "cancellationReason": "Schedule conflict",
    "organizer": {...},
    "attendees": [...]
  }
}
```

### BOOKING_RESCHEDULED Payload

```json
{
  "triggerEvent": "BOOKING_RESCHEDULED",
  "createdAt": "2024-01-15T11:00:00.000Z",
  "payload": {
    "uid": "new-booking-uid",
    "rescheduleUid": "original-booking-uid",
    "title": "30 Minute Meeting",
    "startTime": "2024-01-16T14:00:00.000Z",
    "endTime": "2024-01-16T14:30:00.000Z",
    "reschedulingReason": "Conflict with another meeting",
    "organizer": {...},
    "attendees": [...]
  }
}
```

## Signature Verification

Webhooks include a signature header for verification:

```
X-Cal-Signature-256: sha256=<signature>
```

### Verification Example (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// In your webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-cal-signature-256'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  const { triggerEvent, payload: data } = req.body;
  // ...
  
  res.status(200).send('OK');
});
```

## Get a Webhook

```http
GET /v2/webhooks/{webhookId}
```

## Update a Webhook

```http
PATCH /v2/webhooks/{webhookId}
```

### Request Body

```json
{
  "active": false,
  "triggers": ["BOOKING_CREATED"]
}
```

## Delete a Webhook

```http
DELETE /v2/webhooks/{webhookId}
```

## Event Type Webhooks

Create webhooks specific to an event type:

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

## Organization Webhooks

For organization-wide webhooks:

### List Organization Webhooks

```http
GET /v2/organizations/{orgId}/webhooks
```

### Create Organization Webhook

```http
POST /v2/organizations/{orgId}/webhooks
```

## OAuth Client Webhooks

For platform integrations:

### List OAuth Client Webhooks

```http
GET /v2/oauth-clients/{clientId}/webhooks
```

### Create OAuth Client Webhook

```http
POST /v2/oauth-clients/{clientId}/webhooks
```

## Custom Payload Templates

Customize webhook payloads using templates:

```json
{
  "subscriberUrl": "https://your-app.com/webhook",
  "triggers": ["BOOKING_CREATED"],
  "payloadTemplate": "{\"event\": \"{{triggerEvent}}\", \"booking_id\": \"{{payload.uid}}\", \"attendee\": \"{{payload.attendees[0].email}}\"}"
}
```

### Available Template Variables

- `{{triggerEvent}}` - Event type
- `{{payload.uid}}` - Booking UID
- `{{payload.title}}` - Event title
- `{{payload.startTime}}` - Start time
- `{{payload.endTime}}` - End time
- `{{payload.organizer.name}}` - Organizer name
- `{{payload.organizer.email}}` - Organizer email
- `{{payload.attendees[0].name}}` - First attendee name
- `{{payload.attendees[0].email}}` - First attendee email

## Best Practices

1. **Always verify signatures**: Use the webhook secret to verify payloads
2. **Respond quickly**: Return 200 within 5 seconds, process async if needed
3. **Handle retries**: Webhooks are retried on failure, implement idempotency
4. **Use HTTPS**: Always use HTTPS endpoints for security
5. **Log payloads**: Store webhook payloads for debugging
6. **Monitor failures**: Track webhook delivery failures

## Retry Policy

Failed webhook deliveries are retried with exponential backoff:

- 1st retry: 1 minute
- 2nd retry: 5 minutes
- 3rd retry: 30 minutes
- 4th retry: 2 hours
- 5th retry: 24 hours

After 5 failed attempts, the webhook is marked as failed.
