# Cancellation Reason Requirement Design

## Overview

Add a dropdown setting in Event Type Advanced settings that allows hosts to configure when cancellation reasons are required from hosts and/or attendees.

## Problem Statement

Currently, cancellation reasons are always optional. Hosts need the ability to require reasons for better tracking and accountability.

## User Stories

- As a host, I want to require cancellation reasons from attendees so that I understand why bookings are cancelled
- As a host, I want to require my team to provide cancellation reasons so that we have records of why bookings were cancelled
- As a host, I want to make cancellation reasons optional when they're not needed

## Technical Design

### Database Changes

Add a new enum and column to EventType in packages/prisma/schema.prisma:

```prisma
enum CancellationReasonRequirement {
  MANDATORY_BOTH
  MANDATORY_HOST_ONLY
  MANDATORY_ATTENDEE_ONLY
  OPTIONAL_BOTH
}
```

Add column to EventType model (near disableCancelling/disableRescheduling):

```prisma
requiresCancellationReason  CancellationReasonRequirement?  @default(MANDATORY_HOST_ONLY)
```

Migration required.

### API Changes

Update packages/features/bookings/lib/handleCancelBooking.ts to validate cancellation reason based on:

- Event type's requiresCancellationReason column
- Who is cancelling (host vs attendee)

### UI Changes

**Event Type Settings (apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.tsx)**

Add after Booking Questions section (line 678), before RequiresConfirmationController:

- Label: "Require cancellation reason"
- Description: "Ask for a reason when someone cancels a booking"
- Dropdown with options:
  - Mandatory for both
  - Mandatory for host only (default)
  - Mandatory for attendee only
  - Optional for both

**Cancel Booking (apps/web/components/booking/CancelBooking.tsx)**

Add new prop to Props type:

```typescript
requiresCancellationReason?: "MANDATORY_BOTH" | "MANDATORY_HOST_ONLY" | "MANDATORY_ATTENDEE_ONLY" | "OPTIONAL_BOTH" | null;
```

Replace the current `hostMissingCancellationReason` logic (lines 165-167):

```typescript
// Current (hardcoded host-only requirement):
const hostMissingCancellationReason =
  isCancellationUserHost &&
  (!cancellationReason?.trim() || (props.internalNotePresets.length > 0 && !internalNote?.id));

// New (configurable requirement):
const requirementSetting = props.requiresCancellationReason ?? "MANDATORY_HOST_ONLY";

const isReasonRequiredForUser = () => {
  if (requirementSetting === "OPTIONAL_BOTH") return false;
  if (requirementSetting === "MANDATORY_BOTH") return true;
  if (requirementSetting === "MANDATORY_HOST_ONLY") return isCancellationUserHost;
  if (requirementSetting === "MANDATORY_ATTENDEE_ONLY") return !isCancellationUserHost;
  return false;
};

const missingRequiredReason = isReasonRequiredForUser() && !cancellationReason?.trim();
const hostMissingInternalNote = isCancellationUserHost && props.internalNotePresets.length > 0 && !internalNote?.id;
```

Update button disabled condition (line 270):

```typescript
disabled={missingRequiredReason || hostMissingInternalNote || cancellationNoShowFeeNotAcknowledged}
```

Optionally show required indicator on the textarea label when reason is required

## Data Flow

The `requiresCancellationReason` value needs to flow from EventType to CancelBooking:

1. **Database** → EventType.requiresCancellationReason column
2. **getEventTypesFromDB** (apps/web/lib/booking.ts) → Add to select
3. **getServerSideProps** → Already spreads eventTypeRaw into eventType
4. **PageProps** → eventType includes the field
5. **bookings-single-view.tsx** → Pass as new prop to CancelBooking
6. **CancelBookingDialog.tsx** → Also needs the prop added
7. **CancelBooking.tsx** → Uses prop to determine validation

Files requiring prop threading:

- [apps/web/lib/booking.ts](apps/web/lib/booking.ts) - Add `requiresCancellationReason` to select (line ~46)
- [apps/web/modules/bookings/views/bookings-single-view.tsx](apps/web/modules/bookings/views/bookings-single-view.tsx) - Pass prop to CancelBooking
- [apps/web/components/dialog/CancelBookingDialog.tsx](apps/web/components/dialog/CancelBookingDialog.tsx) - Add to interface and pass to CancelBooking

## Edge Cases

- Platform users: Should respect the setting
- Team bookings: Setting applies regardless of team context
- Null column value: Default to "MANDATORY_HOST_ONLY" behavior
- Default event types (no eventTypeId): Use default "MANDATORY_HOST_ONLY"

## Out of Scope

- Reschedule reason configuration (separate feature)
- Custom reason dropdown options
- Reason analytics/reporting
