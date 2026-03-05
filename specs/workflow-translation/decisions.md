# Workflow Translation Decisions

## ADR-001: Pre-translate vs On-demand Translation

### Context

Need to decide when translations are generated - at workflow save time or at send time.

### Options Considered

1. **On-demand at send time** — Translate when sending to attendee, cache for reuse
   - Pros: Fewer API calls, no unused translations
   - Cons: Slight delay on first send to new locale

2. **Pre-translate at save time** — Translate to all 19 locales when workflow saved
   - Pros: No delay at send time, matches event type pattern
   - Cons: More upfront API calls

### Decision

Pre-translate at save time (option 2) to match the existing event type translation pattern and ensure no delay when sending notifications.

### Consequences

- Translations generated via async tasker task when workflow step is saved
- ~36 API calls per workflow step (18 locales × 2 fields)
- Database stores all translations upfront

## ADR-002: Organization-only Feature

### Context

Need to decide if feature is available to all users or restricted.

### Decision

Organization users only, matching the event type auto-translation feature.

### Consequences

- UI toggle only shown for org users
- Handler checks `ctx.user.organizationId` before triggering translation
