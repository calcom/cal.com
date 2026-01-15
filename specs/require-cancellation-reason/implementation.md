# Require Cancellation Reason Implementation

## Status: completed

## Completed

- [x] Add `cancellationReason` to SystemField enum in `packages/lib/bookings/SystemField.ts`
- [x] Add field configuration in `packages/features/bookings/lib/getBookingFields.ts` with `views: [{ id: "cancel" }]`
- [x] Update `CancelBooking.tsx` to accept `bookingFields` prop and respect required/hidden config
- [x] Update `CancelBookingDialog.tsx` to pass `bookingFields` prop
- [x] Update `bookings-single-view.tsx` to pass `eventType.bookingFields` to CancelBooking
- [x] Update `handleCancelBooking.ts` to validate based on field config (require for guests if field.required is true)
- [x] Add translation strings
- [x] Update FormBuilder.tsx to show Alert for view-based fields (rescheduleReason, cancellationReason)
- [x] Hide Label, Placeholder, Min/Max Characters fields for view-based fields in booking question modal

## In Progress

## Blocked

## Next Steps

1. Run type check to verify no errors
2. Test manually by creating an event type and toggling cancellationReason to required in Booking Questions
3. Add E2E tests

## Session Notes

### 2025-01-15

**Done:**
- Added `cancellationReason` to SystemField enum
- Added field configuration in getBookingFields.ts with `editable: "system-but-optional"` and `views: [{ id: "cancel" }]`
- Updated CancelBooking.tsx:
  - Added `bookingFields` prop
  - Extract cancellationReason field config using useMemo
  - Updated validation: `shouldRequireCancellationReason = isCancellationUserHost || isCancellationReasonRequired`
  - Wrapped textarea in `!isCancellationReasonHidden` condition
  - Updated button disabled state to use new `disableCancelButton` variable
- Updated CancelBookingDialog.tsx to pass bookingFields prop
- Updated bookings-single-view.tsx to pass `eventType.bookingFields`
- Updated handleCancelBooking.ts validation to check bookingFields for required flag
- Added translation strings:
  - `reason_for_cancellation`
  - `reschedule_reason_booking_question_alert`
  - `cancellation_reason_booking_question_alert`
- Updated FormBuilder.tsx:
  - Added Alert component for rescheduleReason and cancellationReason fields explaining when they're displayed
  - Hide Label, Placeholder, DisableOnPrefill, Min/Max Characters for view-based fields

**Key Files Modified:**
- `packages/lib/bookings/SystemField.ts`
- `packages/features/bookings/lib/getBookingFields.ts`
- `apps/web/components/booking/CancelBooking.tsx`
- `apps/web/components/dialog/CancelBookingDialog.tsx`
- `apps/web/modules/bookings/views/bookings-single-view.tsx`
- `packages/features/bookings/lib/handleCancelBooking.ts`
- `apps/web/modules/event-types/components/tabs/advanced/FormBuilder.tsx`
- `apps/web/public/static/locales/en/common.json`
