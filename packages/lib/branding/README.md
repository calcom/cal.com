# Branding System

## Overview

Branding computation centralized; email boundary enforces required `hideBranding`; repository pattern enforced.

## Architecture

### Core Components

- **`BrandingApplicationService`**: Centralized business logic for computing `hideBranding` values
- **`BrandingRepository`**: Database access layer following repository pattern
- **`withHideBranding`**: Email boundary helper ensuring `hideBranding: boolean` in email calls

### Key Principles

1. **Centralized Computation**: All branding logic flows through `BrandingApplicationService`
2. **Repository Pattern**: Database access isolated to `BrandingRepository`
3. **Email Boundary Contract**: Email functions always receive `hideBranding: boolean`
4. **Error Resilience**: Branding computation never fails critical flows
5. **Type Safety**: Strong typing throughout with shared interfaces

### Error Handling

- Service handles all errors internally
- Always returns `false` on error to ensure critical flows continue
- Comprehensive error logging with context
- No try-catch blocks needed in calling code

### Usage

```typescript
// Simple service call - no error handling needed
const brandingService = new BrandingApplicationService(prisma);
const hideBranding = await brandingService.computeHideBranding({
  eventTypeId: 123,
  teamContext: team ?? null,
  owner: user ?? null,
  organizationId: orgId ?? null,
});

// Email boundary - ensures hideBranding is always boolean
await sendScheduledEmailsAndSMS(withHideBranding(calEvent, hideBranding));
```

## Files

- `BrandingApplicationService.ts` - Main business logic
- `BrandingRepository.ts` - Database access
- `types.ts` - Shared type definitions
- `email-manager.ts` - `withHideBranding` helper
