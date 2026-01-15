# Require Cancellation Reason Design

## Overview

Add `cancellationReason` as a configurable system field in the Booking Questions section, similar to how `rescheduleReason` works. Event type organizers can toggle it required/optional from Booking Questions, and when required, both guests and hosts must provide a reason when cancelling a booking.

## Problem Statement

Currently, cancellation reasons are only required for hosts/organizers, and this is hardcoded behavior. There's no way for organizers to require guests to provide a cancellation reason. This feature allows organizers to make cancellation reasons mandatory for everyone, providing better visibility into why bookings are cancelled.

## User Stories

- As an event organizer, I want to require a cancellation reason from guests so that I can understand why they're cancelling and identify patterns
- As an event organizer, I want to configure cancellation reason as optional for certain event types where I don't need this information
- As a guest, I want to see clear feedback when cancellation reason is required so I know what information to provide

## Technical Design

### Database Changes

**No schema migration needed** - `Booking.cancellationReason` column already exists (line 884 in schema.prisma).

The field configuration will be stored in `EventType.bookingFields` JSON field, same as `rescheduleReason`.

### System Field Definition

**File:** `packages/lib/bookings/SystemField.ts`

Add `"cancellationReason"` to the SystemField enum:

```typescript
export const SystemField = z.enum([
  "name",
  "email",
  "location",
  "title",
  "notes",
  "guests",
  "rescheduleReason",
  "cancellationReason",  // NEW
  "smsReminderNumber",
  "attendeePhoneNumber",
  "aiAgentCallPhoneNumber",
]);
```

### Booking Fields Configuration

**File:** `packages/features/bookings/lib/getBookingFields.ts`

Add to `systemAfterFields` array (after rescheduleReason, ~line 314):

```typescript
{
  defaultLabel: "reason_for_cancellation",
  type: "textarea",
  editable: "system-but-optional",
  name: "cancellationReason",
  defaultPlaceholder: "cancellation_reason_placeholder",
  required: false,
  views: [
    {
      id: "cancel",
      label: "Cancel View",
    },
  ],
  sources: [
    {
      label: "Default",
      id: "default",
      type: "default",
    },
  ],
}
```

### UI Changes

**CancelBooking.tsx** (`apps/web/components/booking/CancelBooking.tsx`)

1. Add `bookingFields` prop to receive event type configuration
2. Extract cancellationReason field config: `bookingFields?.find(f => f.name === 'cancellationReason')`
3. Update validation logic:
   - Current: Only hosts must provide reason
   - New: If `field.required === true`, both hosts AND guests must provide reason
4. Conditionally hide textarea if `field.hidden === true`
5. Use field's custom label/placeholder if provided

**CancelBookingDialog.tsx** (`apps/web/components/dialog/CancelBookingDialog.tsx`)

Pass `bookingFields` prop through to CancelBooking component.

**bookings-single-view.tsx** (`apps/web/modules/bookings/views/bookings-single-view.tsx`)

Pass `eventType.bookingFields` to CancelBooking.

### Backend Validation

**File:** `packages/features/bookings/lib/handleCancelBooking.ts`

Update validation (around line 196-206):

```typescript
const cancellationReasonField = bookingToDelete.eventType?.bookingFields?.find(
  (field) => field.name === 'cancellationReason'
);
const isCancellationReasonRequired = cancellationReasonField?.required ?? false;

// For hosts, always require (existing behavior)
// For guests, only require if field is marked as required
const shouldRequireCancellationReason = isCancellationUserHost || isCancellationReasonRequired;

if (
  !platformClientId &&
  !cancellationReason?.trim() &&
  shouldRequireCancellationReason &&
  !skipCancellationReasonValidation
) {
  throw new HttpError({
    statusCode: 400,
    message: isCancellationUserHost
      ? "Cancellation reason is required when you are the host"
      : "Cancellation reason is required",
  });
}
```

### Translation Strings

**File:** `apps/web/public/static/locales/en/common.json`

```json
"reason_for_cancellation": "Reason for cancellation",
"cancellation_reason_required_error": "Cancellation reason is required"
```

## Edge Cases

1. **Existing event types**: `cancellationReason` field will be added with `required: false` by default, preserving existing behavior
2. **API/Platform clients**: `skipCancellationReasonValidation` flag already exists to bypass validation
3. **Host cancellation**: Always requires reason regardless of field configuration (existing behavior preserved)
4. **Hidden field**: If organizer hides the field, it should not be required

## Out of Scope

- Cancellation reason presets for guests (hosts already have internal note presets)
- Cancellation reason analytics/reporting
- Custom validation rules (min/max length)
- Integration with the full BookEventForm (cancellation uses separate CancelBooking component)
