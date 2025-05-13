# Prisma 6.7.0 Migration Plan

## Overview

This document outlines the plan for upgrading cal.com to Prisma 6.7.0, focusing on fixing breaking type issues and ensuring type safety throughout the codebase.

## Files Requiring Updates

### 1. Prisma.PromiseReturnType Replacements ✅

Files updated:

- [x] `packages/features/bookings/lib/get-booking.ts` (GetBookingType)
- [x] `packages/features/bookings/lib/handleNewBooking/createBooking.ts` (Booking type)
- [x] `packages/lib/getBooking.tsx` (GetBookingType)

Replaced with:

```typescript
Awaited<ReturnType<typeof fn>>;
```

### 2. Prisma.[Model]Args Updates ✅

Files updated with explicit generic type parameters:

- [x] `packages/prisma/extensions/exclude-locked-users.ts`
  - Updated UserFindUniqueArgs, UserFindFirstArgs, UserFindManyArgs, UserFindUniqueOrThrowArgs, UserFindFirstOrThrowArgs
- [x] `packages/prisma/extensions/exclude-pending-payment-teams.ts`
  - Updated TeamFindUniqueArgs, TeamFindFirstArgs, TeamFindManyArgs, TeamFindUniqueOrThrowArgs, TeamFindFirstOrThrowArgs
- [x] `packages/lib/server/repository/selectedCalendar.ts`
  - Updated FindManyArgs type

Added `<Prisma.DefaultArgs>` to all Args types where required.

### 3. Zod Schema Updates for Stricter JSON Types ✅

Files updated:

- [x] `apps/api/v1/lib/validations/shared/jsonSchema.ts`
  - Updated jsonSchema to handle stricter Prisma JSON types
- [x] `packages/lib/raqb/zod.ts`
  - Updated raqbQueryValueSchema to handle stricter JSON validation
- [x] `packages/prisma/zod-utils.ts`
  - Reviewed and updated schemas using JsonValue/JsonObject
- [x] `packages/features/form-builder/schema.ts`
  - Updated dbReadResponseSchema for stricter JSON handling

### 4. Validator Updates ✅

Files updated:

- [x] `packages/prisma/selects/app.ts`
  - Updated safeAppSelect validator
- [x] `packages/prisma/selects/booking.ts`
  - Updated bookingMinimalSelect validator
- [x] `packages/prisma/selects/user.ts`
  - Updated availabilityUserSelect, baseUserSelect, userSelect validators
- [x] `packages/lib/server/repository/user.ts`
  - Updated teamSelect and userSelect validators

All validators now have required fields and proper type parameters.

### 5. tRPC Router Updates

Files to review and update:

- [ ] `packages/trpc/server/routers/viewer/me/updateProfile.handler.ts`
  - Update Prisma.UserGetPayload usage
- [ ] `packages/trpc/server/routers/viewer/eventTypes/update.handler.ts`
  - Update Prisma.EventTypeGetPayload usage
- [ ] `packages/trpc/server/routers/viewer/teams/getUserConnectedApps.handler.ts`
  - Update Prisma.CredentialGetPayload usage
- [ ] `packages/trpc/server/routers/viewer/ooo/outOfOfficeCreateOrUpdate.handler.ts`
  - Update Prisma.OutOfOfficeEntryGetPayload usage
- [ ] `packages/trpc/server/routers/viewer/slots/util.ts`
  - Update Prisma.SelectedSlotsGetPayload usage

Files with getPayload usage to update:

- [ ] `packages/app-store/hitpay/lib/types.d.ts`
- [ ] `packages/app-store/googlecalendar/tests/testUtils.ts`
- [ ] `packages/app-store/stripepayment/lib/customer.ts`
- [ ] `packages/app-store/_utils/stripe.ts`
- [ ] `packages/features/eventtypes/lib/getPublicEvent.ts`
- [ ] `packages/features/ee/billing/teams/team-billing.repository.interface.ts`
- [ ] `packages/features/bookings/lib/get-booking.ts`
- [ ] `packages/features/bookings/lib/handleNewBooking/types.ts`
- [ ] `packages/features/bookings/lib/getCalEventResponses.ts`
- [ ] `packages/features/bookings/lib/handleSeats/types.d.ts`
- [ ] `packages/features/ee/workflows/lib/getWorkflowReminders.ts`
- [ ] `packages/features/insights/server/trpc-router.ts`
- [ ] `packages/lib/server/repository/team.ts`
- [ ] `packages/lib/builders/CalendarEvent/builder.ts`
- [ ] `packages/types/Credential.d.ts`

Update strategy:

1. Keep using `Prisma.[Model]GetPayload<{ select: typeof validator }>` exactly as is
2. Only fix any type errors that arise from Prisma 6.7.0 without changing the pattern
3. Update any related tests to match type definitions if needed
4. Keep existing patterns exactly as they are, only fix type-related issues
5. If you find an implicit "any" fix the root cause instead of adding a new import or creating a new type.
6. Respect @calcom/prisma/enums imports

## Implementation Progress

1. **Phase 1: Type Updates** ✅

   - [x] Replace all Prisma.PromiseReturnType instances
   - [x] Add explicit generic type parameters to Prisma.[Model]Args
   - [x] Update validator types

2. **Phase 2: Schema Updates** ✅

   - [x] Update Zod schemas for stricter JSON handling
   - [x] Ensure all JSON fields use proper Prisma types
   - [x] Update form builder schemas

3. **Phase 3: Validator Updates** ✅

   - [x] Update all Prisma.validator instances
   - [x] Add required fields where missing
   - [x] Fix any getPayload usage

4. **Phase 4: Testing & Verification** 🔄

   - [ ] Run `yarn prisma generate` to verify schema changes
   - [ ] Run `yarn workspace @calcom/trpc build` to check for type errors
   - [ ] Test all affected functionality:
     - [ ] Test all tRPC endpoints
     - [ ] Test booking flows
     - [ ] Test team management
     - [ ] Test event type management
     - [ ] Test user profile updates
     - [ ] Test out of office functionality
     - [ ] Test slots functionality
   - [ ] Verify no type assertions or any usage
   - [ ] Run full test suite:
     - [ ] Unit tests
     - [ ] Integration tests
     - [ ] E2E tests
   - [ ] Verify in development environment
   - [ ] Verify in staging environment

## Success Criteria

- [ ] `yarn prisma generate` completes successfully
- [ ] `yarn workspace @calcom/trpc build` passes with no errors
- [ ] All tests pass
- [ ] No usage of `any` type
- [ ] No usage of casting types
- [ ] No type assertions
- [ ] Full type safety maintained

## Notes

- Keep existing patterns where possible
- Maintain backward compatibility
- Document any breaking changes
- Update tests as needed
- Follow KISS and DRY principles

## Next Steps

1. Run `yarn prisma generate` to verify changes
2. Run `yarn workspace @calcom/trpc build` to check for type errors
3. Update tRPC routers and getPayload usage:
   - Start with core booking and user management routers
   - Move to team and event type management
   - Finally update app store integrations
4. Update tests to match new type definitions
5. Run full test suite
6. Document any breaking changes for users
7. Create migration guide for developers

## Breaking Changes

Document any breaking changes that developers need to be aware of:

1. Type changes:

   - Prisma.PromiseReturnType replaced with Awaited<ReturnType<typeof fn>>
   - Prisma.[Model]Args now requires explicit generic type parameters
   - Stricter JSON type handling in Zod schemas
   - Updated validator types with required fields

2. API changes:

   - Any changes to tRPC router return types
   - Any changes to booking or event type handling
   - Any changes to team or user management

3. Migration steps for developers:
   - Update Prisma client
   - Update type imports
   - Update validator usage
   - Update any custom type definitions
   - Test affected functionality
