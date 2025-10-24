# GET /v2/slots/all-of-day

## Overview
Aggregates available time slots across all managed users' event types for a single date.

## Endpoint
```
GET /v2/slots/all-of-day
```

## Headers
- `cal-api-version`: `2024-09-04` (required)
- `Authorization`: Bearer token or API key (if using authenticated requests)

## Query Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `date` | Yes | string | ISO 8601 date | `2050-09-05` |
| `timeZone` | No | string | Time zone for formatting (defaults to UTC) | `Europe/London` |
| `format` | No | string | Use `range` for start/end times, omit for start only | `range` |

## Response Structure

Returns an array of objects, one per event type:

```json
{
  "status": "success",
  "data": [
    {
      "eventTypeId": 123,
      "eventTypeSlug": "30min",
      "ownerUserId": 456,
      "ownerTeamId": null,
      "slotsByDate": {
        "2050-09-05": [
          { "start": "2050-09-05T09:00:00.000+02:00" },
          { "start": "2050-09-05T10:00:00.000+02:00" }
        ]
      }
    }
  ]
}
```

With `format=range`:

```json
{
  "status": "success",
  "data": [
    {
      "eventTypeId": 123,
      "eventTypeSlug": "30min",
      "ownerUserId": 456,
      "ownerTeamId": null,
      "slotsByDate": {
        "2050-09-05": [
          { 
            "start": "2050-09-05T09:00:00.000+02:00",
            "end": "2050-09-05T09:30:00.000+02:00"
          },
          { 
            "start": "2050-09-05T10:00:00.000+02:00",
            "end": "2050-09-05T10:30:00.000+02:00"
          }
        ]
      }
    }
  ]
}
```

## Behavior

- Only returns individual event types (non-team, non-hidden)
- Errors for individual event types are silently handled (returns empty `slotsByDate`)
- Date is validated as ISO 8601 format

## Example Request

```bash
curl -X GET "https://api.cal.com/v2/slots/all-of-day?date=2050-09-05&timeZone=Europe/London&format=range" \
  -H "cal-api-version: 2024-09-04" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

