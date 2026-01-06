# Monthly Proration Migration & Rollout Guide

This document describes the process for rolling out monthly aggregated proration for annual billing plans.

## Overview

The monthly proration feature tracks seat changes (additions/removals) throughout each calendar month and creates a single prorated charge on the 1st of the following month for teams on annual plans.

## Prerequisites

1. **Database Migration**: Run the Prisma migration to create required tables
   ```bash
   yarn workspace @calcom/prisma db-migrate
   ```

2. **Environment Variables**: Ensure the following are set:
   ```bash
   CRON_API_KEY=your-secret-key
   STRIPE_PRIVATE_KEY=sk_xxx
   STRIPE_WEBHOOK_SECRET_BILLING=whsec_xxx
   ```

3. **Stripe Webhooks**: Configure webhooks for:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Rollout Process

### Phase 1: Data Migration (Pre-Deployment)

Populate billing period and price per seat for existing subscriptions:

```bash
# dry-run first to preview changes
ts-node scripts/populate-billing-periods.ts --dry-run

# apply changes
ts-node scripts/populate-billing-periods.ts
```

**What it does:**
- Fetches all teams/orgs with Stripe subscriptions
- Retrieves subscription details from Stripe API
- Populates `billingPeriod` (MONTHLY/ANNUALLY) and `pricePerSeat` fields
- Skips teams that already have these fields populated

### Phase 2: Code Deployment (Feature Flag OFF)

1. **Deploy code** with feature flag disabled (default state)
2. **Verify** Vercel cron is configured:
   ```json
   {
     "path": "/api/cron/monthly-proration",
     "schedule": "5 0 1 * *"
   }
   ```
3. **Monitor** logs for any errors

### Phase 3: Canary Rollout

Enable feature for specific teams via database:

```sql
-- create feature flag if it doesn't exist
INSERT INTO "Feature" (slug, enabled, description, "lastUsedAt")
VALUES ('monthly-proration', false, 'monthly aggregated proration for annual plans', NOW())
ON CONFLICT (slug) DO NOTHING;

-- enable for specific team (canary)
INSERT INTO "TeamFeature" ("teamId", "featureId", state, "assignedBy")
VALUES (
  123, -- team id
  (SELECT id FROM "Feature" WHERE slug = 'monthly-proration'),
  'enabled',
  'admin-user-id'
);
```

**Monitor for 1 week:**
- Seat change logs being created
- Prorations processed on 1st of month
- Stripe invoice items created successfully
- Payment success/failure webhooks working

### Phase 4: Global Rollout

Enable feature globally:

```sql
UPDATE "Feature"
SET enabled = true
WHERE slug = 'monthly-proration';
```

**All annual teams (post-trial) will now:**
- Track seat additions/removals
- Process prorations monthly
- Receive prorated charges via Stripe

## Feature Flag Details

### Flag Name
`monthly-proration`

### Behavior When Disabled
- Seat changes are NOT logged to `SeatChangeLog`
- Monthly proration processing is skipped
- Teams function normally with immediate Stripe quantity updates (existing behavior)

### Behavior When Enabled
- Seat additions/removals logged to `SeatChangeLog`
- Monthly prorations processed on 1st of month
- Stripe invoice items created for net seat increases
- Immediate Stripe subscription updates are skipped for annual plans

## Checking Feature Status

### For a specific team:
```typescript
import { checkIfTeamHasFeature } from "@calcom/features/flags/server/utils";

const isEnabled = await checkIfTeamHasFeature(teamId, "monthly-proration");
```

### Globally:
```typescript
import { checkIfFeatureIsEnabledGlobally } from "@calcom/features/flags/server/utils";

const isEnabled = await checkIfFeatureIsEnabledGlobally("monthly-proration");
```

## Monitoring & Alerts

### Key Metrics
1. **Proration Coverage**: % of annual teams with proration enabled
2. **Payment Success Rate**: % of monthly prorations successfully charged
3. **Processing Health**: Cron job success rate

### Queries

**Teams with annual billing:**
```sql
SELECT COUNT(*) 
FROM "Team" t
LEFT JOIN "TeamBilling" tb ON t.id = tb."teamId"
LEFT JOIN "OrganizationBilling" ob ON t.id = ob."teamId"
WHERE (tb."billingPeriod" = 'ANNUALLY' OR ob."billingPeriod" = 'ANNUALLY')
  AND (tb."subscriptionTrialEnd" < NOW() OR ob."subscriptionTrialEnd" < NOW());
```

**Prorations for current month:**
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'CHARGED' THEN 1 ELSE 0 END) as charged,
  SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
  SUM("proratedAmount") as total_amount
FROM "MonthlyProration"
WHERE "monthKey" = '2026-01';
```

## Rollback Process

If issues arise, disable the feature:

```sql
UPDATE "Feature"
SET enabled = false
WHERE slug = 'monthly-proration';
```

**This will:**
- Stop logging new seat changes
- Stop processing monthly prorations
- Revert to immediate Stripe quantity updates
- Not affect already processed prorations

## Testing

### Manual Test (Staging)
1. Enable feature flag for test team
2. Add/remove members
3. Verify seat change logs created
4. Trigger manual proration:
   ```bash
   curl -X POST https://staging.cal.com/api/cron/monthly-proration?apiKey=YOUR_KEY
   ```
5. Check `MonthlyProration` records
6. Verify Stripe invoice items created

### Integration Tests
```bash
yarn test packages/features/ee/billing/service/proration/__tests__/MonthlyProrationService.integration-test.ts -- --integrationTestsOnly
```

## Support

### Common Issues

**Proration not created:**
- Check feature flag is enabled
- Verify team is on annual plan
- Ensure trial period has ended
- Check seat change logs exist for the month

**Payment failed:**
- Check customer payment method in Stripe
- Review failure reason in `MonthlyProration.failureReason`
- Retry via `MonthlyProrationService.retryFailedProration()`

**Cron not running:**
- Verify Vercel cron configuration
- Check `CRON_API_KEY` environment variable
- Review deployment logs

## Timeline

- **Week 1**: Run data migration, deploy code
- **Week 2-3**: Canary rollout to internal teams
- **Week 4**: Monitor and validate
- **Week 5+**: Global rollout

## Success Criteria

- ✅ All annual teams have billing period populated
- ✅ Seat changes logged correctly
- ✅ Monthly prorations processed automatically
- ✅ >95% payment success rate
- ✅ <1% support ticket rate
- ✅ Average time from seat addition to payment <30 days
