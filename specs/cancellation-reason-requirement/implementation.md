# Cancellation Reason Requirement Implementation

## Status: complete

## Completed

1. Added CancellationReasonRequirement enum to schema.prisma (line 129)
2. Added requiresCancellationReason column to EventType model (line 269)
3. Created database migration (20260115111819_add_cancellation_reason_require)
4. Added translation keys to English locale (common.json)
5. Added dropdown setting in EventAdvancedTab (lines 691-719)
6. Added requiresCancellationReason to getEventTypesFromDB select (apps/web/lib/booking.ts)
7. Passed requiresCancellationReason prop through:
   - bookings-single-view.tsx → CancelBooking
   - CancelBookingDialog.tsx → CancelBooking
8. Updated CancelBooking component Props and validation logic
9. Added server-side validation in handleCancelBooking
10. Added requiresCancellationReason to getBookingToDelete select
11. Fixed dynamic label to show "(optional)" only when isReasonRequiredForUser() returns false

## In Progress

## Blocked

## Next Steps

- Test the feature end-to-end
- Verify all dropdown options work correctly
- Verify dynamic label shows "(optional)" only when appropriate

## Session Notes

- Enum and column were already added to schema during planning phase
- Migration was already created
