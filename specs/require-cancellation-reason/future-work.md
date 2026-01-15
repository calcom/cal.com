# Require Cancellation Reason Future Work

Ideas and enhancements deferred from initial implementation.

## Enhancements

- Cancellation reason presets for guests (similar to internal note presets for hosts)
- Analytics dashboard showing cancellation reasons breakdown
- Conditional required based on time until event (e.g., require reason only if cancelling < 24h before)

## Technical Debt

- Consider unifying CancelBooking with BookEventForm using a "cancel" view
- Consolidate validation logic between UI and backend

## Nice to Have

- Custom validation rules (min/max length for reason)
- Dropdown of predefined reasons instead of free-text
- Multi-language cancellation reason templates
