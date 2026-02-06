# Active User Billing for Organizations

## Context

Currently, **per-active-user billing** only exists for **platform organizations** (apps/api/v2). The logic lives entirely in `apps/api/v2/src/modules/billing/services/billing.service.ts` and reacts to Stripe's `invoice.created` webhook to count managed users who had bookings (as host or attendee) during the billing period, then updates the Stripe subscription quantity.

We need to **extend active-user billing to regular (non-platform) organizations** in `apps/web`, while keeping the platform flow working.

## What "Active User" Means

A user is **active** during a billing period if they were:
- A **host** (organizer) of at least one booking, OR
- An **attendee** of at least one booking

For **platform orgs**: count `isPlatformManaged` users + managed users in managed sub-orgs.
For **regular orgs**: count regular org members (via `Membership` where `teamId = org.id`).

## Architecture Decision

Per Morgan's guidance: extract the active-user calculation into a **service** in `packages/features`, create a **tasker** that runs the calculation and finalizes the Stripe invoice, and inject it in v2 (and web). The Stripe subscription is set to keep invoices in **draft** (disable auto-finalization), and the task finalizes the invoice with the calculated usage.

## Plan

### PR 1: Extract ActiveUserBillingService into packages/features (~200 lines)

**Goal**: Move the active-user counting logic out of `apps/api/v2` into a reusable service in `packages/features`.

#### Step 1: Create ActiveUserBillingRepository

**File**: `packages/features/ee/billing/active-user/repositories/ActiveUserBillingRepository.ts`

Extract the three Prisma queries from `apps/api/v2/src/modules/users/users.repository.ts` (lines 357-424) into a proper repository:

- `getManagedUserEmailsBySubscriptionId(subscriptionId)` - for platform orgs (uses `isPlatformManaged` + `PlatformBilling.subscriptionId`)
- `getOrgMemberEmailsByOrgId(orgId)` - **NEW** for regular orgs (uses `Membership` where `teamId = orgId`)
- `getActiveUsersAsHost(userEmails[], startTime, endTime)` - users who hosted bookings in period
- `getActiveUsersAsAttendee(userEmails[], startTime, endTime)` - users who attended bookings in period

Note: The host/attendee queries become generic - they take a list of emails rather than a subscriptionId, making them reusable for both platform and regular orgs.

#### Step 2: Create ActiveUserBillingService

**File**: `packages/features/ee/billing/active-user/services/ActiveUserBillingService.ts`

```typescript
interface IActiveUserBillingServiceDeps {
  activeUserBillingRepository: ActiveUserBillingRepository;
}

class ActiveUserBillingService {
  // For platform orgs - uses subscription ID to find managed users
  async getActiveUserCountForPlatformOrg(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number>

  // For regular orgs - uses org ID to find members
  async getActiveUserCountForOrg(
    orgId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number>
}
```

Both methods follow the same pattern:
1. Get all candidate user emails (managed users or org members)
2. Find which ones were active as hosts
3. For non-hosts, find which were active as attendees
4. Return total unique count

#### Step 3: Wire up DI

- `packages/features/ee/billing/active-user/di/tokens.ts`
- `packages/features/ee/billing/active-user/di/ActiveUserBillingRepository.module.ts`
- `packages/features/ee/billing/active-user/di/ActiveUserBillingService.module.ts`
- `packages/features/ee/billing/active-user/di/ActiveUserBillingService.container.ts`

#### Step 4: Update apps/api/v2 to use the shared service

Refactor `billing.service.ts` `getActiveManagedUsersCount()` to delegate to the new `ActiveUserBillingService.getActiveUserCountForPlatformOrg()`. Remove the duplicated query logic from `users.repository.ts` (or deprecate in favor of the new repository).

#### Step 5: Tests

- Unit test `ActiveUserBillingService` with mocked repository
- Test both platform org and regular org calculation paths
- Test edge cases: no users, all active, none active, overlap host+attendee

---

### PR 2: Add invoice.created webhook handler for active-user orgs (~150 lines)

**Goal**: When Stripe fires `invoice.created` for an org subscription, calculate active users and finalize the draft invoice.

#### Step 1: Add `billingModel` field to OrganizationBilling (or a way to identify active-user orgs)

We need a way to distinguish orgs on **per-active-user** pricing vs **per-seat** pricing. Options:
- Add a `billingModel` enum field (`PER_SEAT | PER_ACTIVE_USER`) to `OrganizationBilling`
- Or use the existing `planName` field with a new plan value

**Recommendation**: Add `billingModel` field to `OrganizationBilling` model with enum `BillingModel { PER_SEAT, PER_ACTIVE_USER }`, default `PER_SEAT`. This keeps the plan name and billing model as orthogonal concerns.

**File**: `packages/prisma/schema.prisma` - add enum and field to `OrganizationBilling`

#### Step 2: Create `_invoice.created.ts` webhook handler

**File**: `packages/features/ee/billing/api/webhook/_invoice.created.ts`

```
1. Parse invoice from webhook data
2. Look up OrganizationBilling by subscriptionId
3. If billingModel !== PER_ACTIVE_USER, return early (not our concern)
4. Get billing period from invoice (period_start, period_end)
5. Call ActiveUserBillingService.getActiveUserCountForOrg(orgId, periodStart, periodEnd)
6. Create invoice items on the draft invoice for the active user count
7. Finalize the invoice via Stripe API
```

#### Step 3: Register in webhook index

**File**: `packages/features/ee/billing/api/webhook/index.ts` - add `"invoice.created"` handler

#### Step 4: Tests

- Unit test the webhook handler with mocked service and Stripe API

---

### PR 3 (Optional - if tasker pattern is preferred over webhook): Create ActiveUserBilling Tasker

If the team decides the calculation should happen via a scheduled task rather than reacting to `invoice.created` webhook:

- Create `ActiveUserBillingTasker` following the existing pattern in `packages/features/ee/organizations/lib/billing/tasker/`
- Register trigger.dev task for `calculateAndFinalizeInvoice`
- The task would be triggered when `invoice.created` webhook fires (webhook dispatches to tasker instead of doing work inline)

This provides better reliability (retries, monitoring) but adds complexity. **Start with the webhook approach first**, move to tasker if needed.

---

## Key Decisions Needed

1. **How to identify active-user orgs**: New `billingModel` enum on `OrganizationBilling` vs. reusing `planName`?
2. **Invoice finalization approach**: Webhook-inline vs. tasker dispatch? (Morgan suggested tasker, but webhook-inline is simpler to start)
3. **Stripe setup**: Who manually sets up the subscription with `collection_method: "send_invoice"` (or equivalent draft mode)? Is this always manual for now?
4. **Frontend**: Is any frontend work needed in this PR, or is that a separate effort?

## Files Changed (PR 1)

| File | Action |
|------|--------|
| `packages/features/ee/billing/active-user/repositories/ActiveUserBillingRepository.ts` | Create |
| `packages/features/ee/billing/active-user/services/ActiveUserBillingService.ts` | Create |
| `packages/features/ee/billing/active-user/di/tokens.ts` | Create |
| `packages/features/ee/billing/active-user/di/*.module.ts` | Create |
| `packages/features/ee/billing/active-user/di/*.container.ts` | Create |
| `packages/features/ee/billing/active-user/services/ActiveUserBillingService.test.ts` | Create |
| `apps/api/v2/src/modules/billing/services/billing.service.ts` | Modify (delegate to shared service) |

## Files Changed (PR 2)

| File | Action |
|------|--------|
| `packages/prisma/schema.prisma` | Modify (add billingModel enum + field) |
| `packages/features/ee/billing/api/webhook/_invoice.created.ts` | Create |
| `packages/features/ee/billing/api/webhook/index.ts` | Modify (register new handler) |
| `packages/features/ee/billing/api/webhook/_invoice.created.test.ts` | Create |
