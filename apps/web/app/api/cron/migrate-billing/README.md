# Billing Migration Cron Job

This cron job migrates team and organization subscription billing data from the Team metadata field to the dedicated `TeamBilling` and `OrganizationBilling` tables.

## Purpose

Historically, team and organization billing information (subscriptionId, subscriptionItemId, customerId, etc.) was stored in the `Team.metadata` JSON field. This cron job facilitates the migration to the new normalized billing tables for better data management and querying capabilities.

## How It Works

1. Queries bookings created within a specified lookback period (default: last 24 hours)
2. Extracts unique team IDs from those bookings
3. For each team:
   - Checks if billing data already exists in the new tables
   - Skips if already migrated
   - Parses metadata to extract subscription information
   - Creates a record in either `TeamBilling` or `OrganizationBilling` based on the team type

## Migration Strategy

The job is designed to run regularly (e.g., daily) to catch teams/orgs that make new bookings. This approach:
- Has zero impact on user experience (runs asynchronously)
- Processes teams incrementally as they become active
- Avoids overwhelming the database with a single large migration
- Provides clear logging and error tracking

## API Endpoint

**POST** `/api/cron/migrate-billing`

### Authentication

Requires one of:
- `CRON_API_KEY` in environment variables (via header or query param)
- `CRON_SECRET` in environment variables (as Bearer token)

### Query Parameters

- `lookbackHours` (optional): Number of hours to look back for bookings
  - Default: 24
  - Min: 1
  - Max: 168 (1 week)

### Example Requests

```bash
# Migrate teams from last 24 hours
curl -X POST "https://yourdomain.com/api/cron/migrate-billing" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Migrate teams from last 48 hours
curl -X POST "https://yourdomain.com/api/cron/migrate-billing?lookbackHours=48" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Using API key as query parameter
curl -X POST "https://yourdomain.com/api/cron/migrate-billing?apiKey=${CRON_API_KEY}"
```

### Response Format

```json
{
  "ok": true,
  "lookbackHours": 24,
  "lookbackDate": "2025-10-15T00:00:00.000Z",
  "teamsFound": 15,
  "migrated": 8,
  "skipped": 7,
  "errors": 0,
  "errorDetails": []
}
```

**Response Fields:**
- `ok`: Whether the job completed successfully
- `lookbackHours`: Configured lookback period
- `lookbackDate`: Calculated cutoff date
- `teamsFound`: Number of unique teams found in recent bookings
- `migrated`: Number of teams successfully migrated
- `skipped`: Number of teams skipped (already migrated or no subscription data)
- `errors`: Number of teams that failed to migrate
- `errorDetails`: Array of error details with teamId and error message

## Scheduling

To set up automated scheduling, configure your cron service (e.g., Vercel Cron, GitHub Actions, or cron.job) to call this endpoint daily.

### Example: Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/migrate-billing",
    "schedule": "0 2 * * *"
  }]
}
```

This runs the job daily at 2:00 AM UTC.

## Monitoring

The job logs all operations with the prefix `cron:migrate-billing`:

- `info`: Start, completion, and migration events
- `warn`: Missing teams
- `debug`: Skip reasons
- `error`: Migration failures

### Example Log Output

```
[cron:migrate-billing] Starting billing migration for bookings created since 2025-10-15T00:00:00.000Z
[cron:migrate-billing] Found 15 unique teams from recent bookings
[cron:migrate-billing] Team 123 already has billing record, skipping
[cron:migrate-billing] Migrated team 456 to TeamBilling table
[cron:migrate-billing] Migrated organization 789 to OrganizationBilling table
[cron:migrate-billing] Billing migration completed: {"ok":true,"teamsFound":15,"migrated":8,"skipped":7,"errors":0}
```

## Migration Data Mapping

The following data is migrated from `Team.metadata` to the billing tables:

| Metadata Field | Billing Table Field |
|---------------|-------------------|
| `subscriptionId` | `subscriptionId` |
| `subscriptionItemId` | `subscriptionItemId` |
| `paymentId` | `customerId` |
| - | `status` (default: "ACTIVE") |
| `isOrganization` | `planName` (TEAM or ORGANIZATION) |
| `subscriptionStartDate` | `subscriptionStart` |
| `subscriptionTrialEndDate` | `subscriptionTrialEnd` |
| `subscriptionEndDate` | `subscriptionEnd` |

## Skip Conditions

Teams are skipped if:
1. Already migrated (billing record exists)
2. No `subscriptionId` in metadata
3. No `subscriptionItemId` in metadata
4. Team not found in database

## Error Handling

- Errors are logged but don't stop the migration process
- Failed teams are recorded in `errorDetails`
- The job continues processing remaining teams
- Returns 500 status only if the entire job fails (e.g., database connection issues)

## Rollback

If needed, billing records can be deleted:

```sql
-- Remove all migrated billing records (use with caution)
DELETE FROM "TeamBilling";
DELETE FROM "OrganizationBilling";
```

## Future Improvements

- Add dry-run mode to preview migrations without executing
- Support manual team ID input for targeted migrations
- Add Stripe API integration to fetch real-time subscription status
- Implement duplicate detection to prevent race conditions
