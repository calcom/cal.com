# GET /v2/slots/by-users

## Overview
Fetches available time slots for a filtered subset of users on a specific date. Returns slots only for the specified user IDs, improving performance compared to fetching all users.

## Endpoint
```
GET /v2/slots/by-users
```

## Headers
- `cal-api-version`: `2024-09-04` (required)

## Query Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `date` | Yes | string | ISO 8601 date (YYYY-MM-DD) | `2050-09-05` |
| `timeZone` | Yes | string | IANA timezone string | `Europe/London` |
| `userIds` | Yes | string | Comma-separated Cal.com user IDs (max 50) | `1,10,11,12` |
| `format` | No | string | Use `range` for start/end times, omit for start only | `range` |

## Response Structure

Returns an array of objects, one per event type owned by the specified users:

```json
{
  "status": "success",
  "data": [
    {
      "eventTypeId": 2,
      "eventTypeSlug": "15min",
      "ownerUserId": 1,
      "ownerTeamId": null,
      "slotsByDate": {
        "2050-09-05": [
          { "start": "2050-09-05T08:00:00.000+01:00" },
          { "start": "2050-09-05T08:15:00.000+01:00" }
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
      "eventTypeId": 2,
      "eventTypeSlug": "15min",
      "ownerUserId": 1,
      "ownerTeamId": null,
      "slotsByDate": {
        "2050-09-05": [
          { 
            "start": "2050-09-05T08:00:00.000+01:00",
            "end": "2050-09-05T08:15:00.000+01:00"
          },
          { 
            "start": "2050-09-05T08:15:00.000+01:00",
            "end": "2050-09-05T08:30:00.000+01:00"
          }
        ]
      }
    }
  ]
}
```

## Behavior

- Only returns individual event types (non-team, non-hidden)
- Filters to only event types owned by users in the `userIds` list
- Non-existent user IDs are gracefully ignored (no error thrown)
- Returns empty array if no event types found for specified users
- Date is validated as ISO 8601 format
- Maximum 50 user IDs per request

## Error Responses

### 400 Bad Request - Missing Parameters
```json
{
  "statusCode": 400,
  "message": "Missing required parameter: date"
}
```

### 400 Bad Request - Invalid Date Format
```json
{
  "statusCode": 400,
  "message": "Invalid date format. Expected ISO 8601 like 2050-09-05"
}
```

### 400 Bad Request - Invalid userIds Format
```json
{
  "statusCode": 400,
  "message": "Invalid userIds format. Must be comma-separated positive integers. Invalid value: 'abc'"
}
```

### 400 Bad Request - Empty userIds
```json
{
  "statusCode": 400,
  "message": "userIds cannot be empty"
}
```

### 400 Bad Request - Too Many User IDs
```json
{
  "statusCode": 400,
  "message": "Maximum 50 user IDs allowed"
}
```

## Example Requests

### Basic Request (Single User)
```bash
curl -X GET "https://api.cal.com/v2/slots/by-users?date=2050-09-05&timeZone=America/New_York&userIds=1" \
  -H "cal-api-version: 2024-09-04"
```

### Multiple Users with Range Format
```bash
curl -X GET "https://api.cal.com/v2/slots/by-users?date=2050-09-05&timeZone=Europe/London&format=range&userIds=1,10,11,12" \
  -H "cal-api-version: 2024-09-04"
```

### Different Timezone
```bash
curl -X GET "https://api.cal.com/v2/slots/by-users?date=2050-09-05&timeZone=Asia/Tokyo&userIds=5,8,15" \
  -H "cal-api-version: 2024-09-04"
```

## Validation Rules

1. **date**: Must be valid ISO 8601 format (YYYY-MM-DD)
2. **timeZone**: Must be valid IANA timezone string
3. **userIds**: 
   - Must be comma-separated
   - Each ID must be a positive integer
   - Maximum 50 IDs per request
   - No whitespace issues (automatically trimmed)
4. **format**: Optional, accepts "range" or omit for timestamp format

## Performance Considerations

- Much faster than `/v2/slots/all-of-day` when querying subset of users
- Slots for each event type are fetched in parallel
- Individual event type errors are silently handled (won't fail entire request)
- Recommended to query 5-15 users at a time for optimal performance

## Use Cases

1. **Filtered Mentor Lists**: Get slots for mentors filtered by college, major, or favorites
2. **Team Scheduling**: Get availability for specific team members
3. **Departmental Booking**: Query specific department users
4. **Performance Optimization**: Avoid fetching slots for all users when only subset needed

## Comparison with /v2/slots/all-of-day

| Feature | /v2/slots/all-of-day | /v2/slots/by-users |
|---------|---------------------|-------------------|
| User Filter | All users | Specified user IDs only |
| timeZone | Optional (defaults to UTC) | Required |
| Performance | Slower with many users | Faster for subset |
| Use Case | Get overview of all availability | Get specific users' availability |

## Authentication

No authentication required - this is a public endpoint.

