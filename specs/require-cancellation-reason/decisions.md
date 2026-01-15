# Require Cancellation Reason Decisions

## ADR-001: Use bookingFields system instead of separate EventType field

### Context

Need to allow organizers to configure whether cancellation reason is required. Two approaches possible:
1. Add a simple boolean `requiresCancellationReason` to EventType model
2. Add `cancellationReason` as a system field in the existing `bookingFields` system

### Options Considered

1. **Simple boolean field** — Easier to implement, but doesn't follow existing patterns
2. **bookingFields system** — Follows rescheduleReason pattern, allows more customization (label, placeholder, hidden)

### Decision

Use the bookingFields system to match how `rescheduleReason` is implemented.

### Consequences

- Consistent with existing patterns
- Organizers can customize label/placeholder
- Field appears in Booking Questions UI alongside other fields
- No database migration needed (Booking.cancellationReason already exists)

## ADR-002: Keep CancelBooking as separate component

### Context

The booking form uses `BookEventForm` with `BookingFields` component that renders fields based on `bookingFields` config. Cancellation uses a separate `CancelBooking.tsx` component.

### Options Considered

1. **Integrate into BookEventForm** — Add a "cancel" view like "reschedule" view
2. **Keep CancelBooking separate** — Have it read bookingFields config directly

### Decision

Keep CancelBooking as a separate component that reads the bookingFields configuration.

### Consequences

- Less invasive change
- Cancellation flow remains distinct from booking flow
- CancelBooking needs to accept and parse bookingFields prop
- Validation logic duplicated between CancelBooking UI and handleCancelBooking backend
