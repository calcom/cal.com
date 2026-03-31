# Validation Migration Tracking

This document tracks the migration of validation logic from `RegularBookingService` to `BookingDataPreparationService`.

## Goal

Move all validation/enrichment logic out of `RegularBookingService.handler()` into `BookingDataPreparationService` for:
- Better testability (unit test validations in isolation)
- Reusability (RecurringBookingService, API v2 can share preparation logic)
- Reduced handler size (~300 lines extracted)

## Migration Status

### ✅ Moved to BookingDataPreparationService

| Validation | Function | Status |
|------------|----------|--------|
| Event type + recurring seats constraint | Inline check | ✅ Done |
| Booker email blocked | `checkIfBookerEmailIsBlocked` | ✅ Done |
| Active bookings limit | `checkActiveBookingsLimitForBooker` | ✅ Done |
| Email verification required | `verifyCodeUnAuthenticated` | ✅ Done |
| Booking time out of bounds | `validateBookingTimeIsNotOutOfBounds` | ✅ Done |
| Event length validation | `validateEventLength` | ✅ Done |
| Spam check (start) | `spamCheckService.startCheck` | ✅ Done |

### ⏳ Pending (for follow-up PRs)

| Validation | Function | Notes |
|------------|----------|-------|
| Guest email verification | `validateGuestEmails` | Checks guests against blocklist |


## Integration Status

- [x] **This PR**: Service created with tests, NOT integrated into handler
- [x] **Follow-up PR 1**: Integrate into `RegularBookingService.handler()`
- [x] **Follow-up PR 2**: Integrate into `RecurringBookingService` (delegates to RegularBookingService)
- [x] **Follow-up PR 3**: Create API v2 wrapper service

