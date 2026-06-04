# Cancellation Reason Requirement Decisions

## ADR-001: Store in Database Column vs Metadata JSON

### Context

Need to store the cancellation reason requirement setting on EventType.

### Options Considered

1. **New database column with enum** — Requires migration, type-safe, cleaner queries
2. **Metadata JSON field** — No migration, but less type-safe for a core setting

### Decision

Use a dedicated database column with a Prisma enum (`CancellationReasonRequirement`).

Rationale:
- This is a core booking flow setting, similar to `disableCancelling` and `requiresConfirmation`
- Type-safe at the database level
- Cleaner to query in cancellation validation logic
- Consistent with how similar settings (`disableCancelling`, `disableRescheduling`) are stored

### Consequences

- Requires database migration
- Type-safe enum values
- Direct column access in queries (no JSON parsing)
