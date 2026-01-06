# Monthly Proration Trigger.dev Tasks

This directory contains Trigger.dev tasks for processing monthly prorations on annual billing plans.

## Tasks

### 1. `processMonthlyProration`
**ID**: `billing.monthly-proration.process`
**File**: `monthly-proration.ts`

Main task for processing monthly prorations. Should be triggered on the 1st of each month.

**Payload**:
```typescript
{
  monthKey?: string; // Optional: "YYYY-MM" format, defaults to previous month
}
```

**Usage**:
Since Trigger.dev v4 doesn't support cron schedules in the task definition, this task should be triggered via:
- External cron service (e.g., Vercel Cron, GitHub Actions)
- Trigger.dev UI scheduled triggers
- Manual API call

**Example External Cron** (Vercel cron.json):
```json
{
  "crons": [{
    "path": "/api/cron/monthly-proration",
    "schedule": "5 0 1 * *"
  }]
}
```

### 2. `processMonthlyProrationManual`
**ID**: `billing.monthly-proration.process-manual`
**File**: `monthly-proration-manual.ts`

Manual task for testing or processing specific teams/months.

**Payload**:
```typescript
{
  monthKey: string;        // Required: "YYYY-MM" format
  teamIds?: number[];      // Optional: Process only specific teams
}
```

**Usage**:
Trigger via Trigger.dev dashboard or API for:
- Testing in development
- Reprocessing a specific month
- Processing prorations for specific teams

## Deployment

Deploy tasks to Trigger.dev:

```bash
cd packages/features
yarn deploy:trigger
```

## Monitoring

Tasks are configured with:
- **Machine**: small-2x
- **Max Attempts**: 3
- **Retry Strategy**: Exponential backoff (2x factor)
- **Min Timeout**: 1s
- **Max Timeout**: 10s

All runs are logged via TriggerDevLogger and visible in the Trigger.dev dashboard.
