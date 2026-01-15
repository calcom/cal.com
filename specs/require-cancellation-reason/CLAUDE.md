# CLAUDE.md — Require Cancellation Reason

## Project Context

This feature adds `cancellationReason` as a configurable system field in Booking Questions, allowing organizers to require guests to provide a reason when cancelling. Similar to how `rescheduleReason` works.

## Before Starting Work

1. Read specs/require-cancellation-reason/design.md
2. Check specs/require-cancellation-reason/implementation.md for current progress
3. Look at existing patterns in:
   - packages/lib/bookings/SystemField.ts (how rescheduleReason is defined)
   - packages/features/bookings/lib/getBookingFields.ts (how rescheduleReason is configured)
   - apps/web/components/booking/CancelBooking.tsx (current cancellation UI)
   - packages/features/bookings/lib/handleCancelBooking.ts (current validation)

## Code Patterns

- System fields are defined in `SystemField.ts` as a Zod enum
- Field configuration in `getBookingFields.ts` uses `views` array to control when fields appear
- `rescheduleReason` uses `views: [{ id: "reschedule" }]` - follow this pattern with `views: [{ id: "cancel" }]`
- `editable: "system-but-optional"` allows organizers to toggle required/optional but not delete

## Don't

- Don't add features not in design.md
- Don't break existing host cancellation reason requirement (hosts should always require reason)
- Don't skip validation in handleCancelBooking.ts
- Don't modify the Prisma schema (Booking.cancellationReason already exists)
