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

Add new enum `CancellationReasonRequirement` with values:
- `MANDATORY_BOTH`
- `MANDATORY_HOST_ONLY`
- `MANDATORY_ATTENDEE_ONLY`
- `OPTIONAL_BOTH`

Add column `requiresCancellationReason` to EventType model with default `MANDATORY_HOST_ONLY`.

Location: `packages/prisma/schema.prisma` (near `disableCancelling`/`disableRescheduling`)

### API Changes

Update `packages/features/bookings/lib/handleCancelBooking.ts` to validate cancellation reason based on:
- Event type's `requiresCancellationReason` setting
- Who is cancelling (host vs attendee)

### UI Changes

**Event Type Settings**

Location: `apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.tsx`

Add dropdown after Booking Questions section, before RequiresConfirmationController:
- Label: "Require cancellation reason"
- Description: "Ask for a reason when someone cancels a booking"
- Options: Mandatory for both, Mandatory for host only (default), Mandatory for attendee only, Optional for both

**Cancel Booking**

Location: `apps/web/components/booking/CancelBooking.tsx`

- Add `requiresCancellationReason` prop
- Replace hardcoded `hostMissingCancellationReason` logic with configurable validation based on the setting
- Show required indicator on textarea when reason is required

## Data Flow

1. EventType stores `requiresCancellationReason` in database
2. `getEventTypesFromDB` (`apps/web/lib/booking.ts`) includes the field in select
3. Value flows through page props to booking views
4. `CancelBooking` component uses it for validation

Files requiring prop threading:
- `apps/web/lib/booking.ts`
- `apps/web/modules/bookings/views/bookings-single-view.tsx`
- `apps/web/components/dialog/CancelBookingDialog.tsx`

## Edge Cases

- Platform users: Should respect the setting
- Team bookings: Setting applies regardless of team context
- Null column value: Default to `MANDATORY_HOST_ONLY` behavior
- Default event types (no eventTypeId): Use default `MANDATORY_HOST_ONLY`

## Out of Scope

- Reschedule reason configuration (separate feature)
- Custom reason dropdown options
- Reason analytics/reporting
