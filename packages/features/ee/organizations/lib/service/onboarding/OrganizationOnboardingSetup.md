# Organization Onboarding Setup

This document explains how the organization onboarding system works and how to configure it for different deployment scenarios.

## Overview

The organization onboarding system supports two different flows:

1. **Billing-Enabled Flow** (BillingEnabledOrgOnboardingService): Used on hosted Cal.com with Stripe integration
2. **Self-Hosted Flow** (SelfHostedOrganizationOnboardingService): Used on self-hosted instances where admins can create organizations without payment

The system automatically selects the appropriate flow based on environment variables and user permissions.

## Architecture

### Factory Pattern

The `OrganizationOnboardingFactory` class determines which onboarding service to use:

```typescript
OrganizationOnboardingFactory.create(user)
  → BillingEnabledOrgOnboardingService | SelfHostedOrganizationOnboardingService
```

### Decision Logic

The factory uses the following logic to determine which service to instantiate:

```
IF process.env.NEXT_PUBLIC_IS_E2E is set:
  → Use SelfHostedOrganizationOnboardingService (E2E tests always skip billing)

ELSE IF IS_TEAM_BILLING_ENABLED is true:
  → Use BillingEnabledOrgOnboardingService (hosted environment with Stripe)

ELSE IF user.role is ADMIN:
  → Use SelfHostedOrganizationOnboardingService (self-hosted admins skip billing)

ELSE:
  → Use BillingEnabledOrgOnboardingService (non-admins need billing even on self-hosted)
```

## Environment Variables

### Required for Billing-Enabled Flow

```bash
# Stripe Configuration
STRIPE_CLIENT_ID=your_stripe_client_id
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_PRIVATE_KEY=your_stripe_private_key

# These enable IS_STRIPE_ENABLED and IS_TEAM_BILLING_ENABLED
```

### Optional Configuration

```bash
# Force hosted features on self-hosted instances
NEXT_PUBLIC_HOSTED_CAL_FEATURES=true

# E2E testing (disables billing flow)
NEXT_PUBLIC_IS_E2E=1

# Organization pricing
NEXT_PUBLIC_ORGANIZATIONS_SELF_SERVE_PRICE_NEW=37
```

## Constants

The system relies on several computed constants from `@calcom/lib/constants`:

### Server-Side Constants

- **`IS_TEAM_BILLING_ENABLED`**: `IS_STRIPE_ENABLED && HOSTED_CAL_FEATURES`

  - Determines if billing is globally enabled
  - Used in: `OrganizationOnboardingFactory`

- **`IS_STRIPE_ENABLED`**: `!!(STRIPE_CLIENT_ID && NEXT_PUBLIC_STRIPE_PUBLIC_KEY && STRIPE_PRIVATE_KEY)`

  - Checks if Stripe is properly configured

- **`HOSTED_CAL_FEATURES`**: `process.env.NEXT_PUBLIC_HOSTED_CAL_FEATURES || !IS_SELF_HOSTED`

  - Enables hosted features (including billing)

- **`IS_SELF_HOSTED`**: `!CAL_DOMAINS.some(domain => WEBAPP_HOSTNAME.endsWith(domain))`
  - Detects if running on official Cal.com domains

### Client-Side Constants

- **`IS_TEAM_BILLING_ENABLED_CLIENT`**: `!!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY && HOSTED_CAL_FEATURES`
  - Client-safe version of billing check
  - Used in: `onboardingStore.ts`

## Configuration Scenarios

### Scenario 1: Hosted Cal.com (Official)

**Environment:**

```bash
# Domain: *.cal.com, *.cal.dev, etc.
STRIPE_CLIENT_ID=ca_xxx
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_xxx
STRIPE_PRIVATE_KEY=sk_live_xxx
```

**Result:**

- `IS_SELF_HOSTED` = `false`
- `HOSTED_CAL_FEATURES` = `true`
- `IS_TEAM_BILLING_ENABLED` = `true`
- All users → **BillingEnabledOrgOnboardingService**

### Scenario 2: Self-Hosted with Billing (Optional)

**Environment:**

```bash
# Domain: custom.example.com
NEXT_PUBLIC_HOSTED_CAL_FEATURES=true
STRIPE_CLIENT_ID=ca_xxx
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_xxx
STRIPE_PRIVATE_KEY=sk_live_xxx
```

**Result:**

- `IS_SELF_HOSTED` = `true`
- `HOSTED_CAL_FEATURES` = `true` (forced)
- `IS_TEAM_BILLING_ENABLED` = `true`
- All users → **BillingEnabledOrgOnboardingService**

### Scenario 3: Self-Hosted without Billing (Default)

**Environment:**

```bash
# Domain: custom.example.com
# No Stripe configuration
```

**Result:**

- `IS_SELF_HOSTED` = `true`
- `HOSTED_CAL_FEATURES` = `false`
- `IS_TEAM_BILLING_ENABLED` = `false`
- Admin users → **SelfHostedOrganizationOnboardingService**
- Regular users → **BillingEnabledOrgOnboardingService** (will fail without Stripe)

**Recommendation:** In this scenario, only admins should be allowed to create organizations.

### Scenario 4: E2E Testing

**Environment:**

```bash
NEXT_PUBLIC_IS_E2E=1
# Any other configuration
```

**Result:**

- All users → **SelfHostedOrganizationOnboardingService**
- Billing flow is completely bypassed

## User Roles

The system differentiates between two user roles:

### Admin Users (`UserPermissionRole.ADMIN`)

- Can create organizations without billing on self-hosted instances
- Can access self-hosted flow when `IS_TEAM_BILLING_ENABLED` is false

### Regular Users (`UserPermissionRole.USER`)

- Always require billing flow
- Cannot create organizations on self-hosted without Stripe configured

```

```
