# Schedules API Reference

Detailed documentation for schedule management endpoints in the Cal.com API v2.

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/schedules | List all schedules |
| POST | /v2/schedules | Create a schedule |
| GET | /v2/schedules/default | Get default schedule |
| GET | /v2/schedules/{scheduleId} | Get a schedule |
| PATCH | /v2/schedules/{scheduleId} | Update a schedule |
| DELETE | /v2/schedules/{scheduleId} | Delete a schedule |

## Understanding Schedules

Schedules define when a user is available for bookings. Key concepts:

- **Working Hours**: Regular weekly availability (e.g., Mon-Fri 9am-5pm)
- **Date Overrides**: Exceptions to regular hours (e.g., holiday, special hours)
- **Timezone**: The timezone in which availability is defined
- **Default Schedule**: The primary schedule used when no specific schedule is assigned

## List Schedules

```http
GET /v2/schedules
```

### Response

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Working Hours",
      "isDefault": true,
      "timeZone": "America/New_York",
      "workingHours": [
        {
          "days": [1, 2, 3, 4, 5],
          "startTime": 540,
          "endTime": 1020
        }
      ],
      "availability": [
        {
          "id": 1,
          "days": [1, 2, 3, 4, 5],
          "startTime": "1970-01-01T09:00:00.000Z",
          "endTime": "1970-01-01T17:00:00.000Z"
        }
      ],
      "dateOverrides": [],
      "isManaged": false,
      "readOnly": false,
      "isLastSchedule": false
    }
  ]
}
```

## Create a Schedule

```http
POST /v2/schedules
```

### Request Body

```json
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
  ],
  "dateOverrides": [
    {
      "date": "2024-12-25",
      "startTime": null,
      "endTime": null
    }
  ]
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Schedule name |
| timeZone | string | Yes | IANA timezone identifier |
| isDefault | boolean | No | Set as default schedule |
| availability | array | Yes | Weekly availability rules |
| dateOverrides | array | No | Date-specific overrides |

### Availability Object

| Field | Type | Description |
|-------|------|-------------|
| days | array | Days of week (0=Sunday, 1=Monday, ..., 6=Saturday) |
| startTime | string | Start time in HH:MM format |
| endTime | string | End time in HH:MM format |

### Date Override Object

| Field | Type | Description |
|-------|------|-------------|
| date | string | Date in YYYY-MM-DD format |
| startTime | string/null | Start time (null = unavailable) |
| endTime | string/null | End time (null = unavailable) |

## Get Default Schedule

```http
GET /v2/schedules/default
```

Returns the user's default schedule.

## Get a Schedule

```http
GET /v2/schedules/{scheduleId}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| scheduleId | number | Schedule ID |

## Update a Schedule

```http
PATCH /v2/schedules/{scheduleId}
```

### Request Body

Only include fields you want to update:

```json
{
  "name": "Updated Schedule Name",
  "availability": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "08:00",
      "endTime": "18:00"
    }
  ]
}
```

## Delete a Schedule

```http
DELETE /v2/schedules/{scheduleId}
```

Note: You cannot delete your last schedule. At least one schedule must exist.

## Common Schedule Patterns

### Standard Business Hours (Mon-Fri 9-5)

```json
{
  "name": "Business Hours",
  "timeZone": "America/New_York",
  "availability": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

### Split Schedule (Morning and Afternoon)

```json
{
  "name": "Split Hours",
  "timeZone": "America/New_York",
  "availability": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "09:00",
      "endTime": "12:00"
    },
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "14:00",
      "endTime": "18:00"
    }
  ]
}
```

### Different Hours Per Day

```json
{
  "name": "Variable Hours",
  "timeZone": "America/New_York",
  "availability": [
    {
      "days": [1, 3, 5],
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "days": [2, 4],
      "startTime": "10:00",
      "endTime": "19:00"
    }
  ]
}
```

### Weekend Availability

```json
{
  "name": "Weekend Support",
  "timeZone": "America/New_York",
  "availability": [
    {
      "days": [0, 6],
      "startTime": "10:00",
      "endTime": "14:00"
    }
  ]
}
```

### Holiday Override (Unavailable)

```json
{
  "dateOverrides": [
    {
      "date": "2024-12-25",
      "startTime": null,
      "endTime": null
    },
    {
      "date": "2024-01-01",
      "startTime": null,
      "endTime": null
    }
  ]
}
```

### Special Hours Override

```json
{
  "dateOverrides": [
    {
      "date": "2024-12-24",
      "startTime": "09:00",
      "endTime": "12:00"
    }
  ]
}
```

## Organization/Team Schedules

For organization-level schedule management:

### List Organization Schedules

```http
GET /v2/organizations/{orgId}/schedules
```

### List User Schedules in Organization

```http
GET /v2/organizations/{orgId}/users/{userId}/schedules
```

### Create User Schedule in Organization

```http
POST /v2/organizations/{orgId}/users/{userId}/schedules
```

### Team Member Schedules

```http
GET /v2/organizations/{orgId}/teams/{teamId}/users/{userId}/schedules
```

## Working Hours Format

The API returns working hours in two formats:

### Minutes from Midnight

```json
{
  "workingHours": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": 540,
      "endTime": 1020
    }
  ]
}
```

- `540` = 9:00 AM (9 * 60 minutes)
- `1020` = 5:00 PM (17 * 60 minutes)

### ISO Time Format

```json
{
  "availability": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "1970-01-01T09:00:00.000Z",
      "endTime": "1970-01-01T17:00:00.000Z"
    }
  ]
}
```

When creating/updating, use HH:MM format:

```json
{
  "startTime": "09:00",
  "endTime": "17:00"
}
```

## Best Practices

1. **Always specify timezone**: Schedules are timezone-aware
2. **Use date overrides sparingly**: For recurring patterns, create separate schedules
3. **Test availability**: After creating a schedule, verify with the slots endpoint
4. **Consider buffer times**: Set buffers on event types, not schedules
