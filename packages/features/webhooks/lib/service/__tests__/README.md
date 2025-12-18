# Webhook Payload Compatibility Tests

## Purpose

These tests ensure the new **Producer/Consumer pattern** generates **identical webhook payloads** to the current implementation.

## Why This Matters

- **External Contracts**: Webhooks are consumed by third-party systems (Zapier, Make, custom integrations)
- **Breaking Changes**: Any payload changes could break customer integrations
- **Production Risk**: Silent payload differences = production incidents
- **Zero Tolerance**: We must guarantee 100% payload compatibility

## Test Strategy

### Phase 0: Infrastructure (✅ Complete)
- Test fixtures created (`fixtures.ts`)
- Test scaffold established (`payload-compatibility.test.ts`)
- Comparison helpers defined
- Pattern documented for all 11 trigger events

### Post-Phase 0: Full Implementation
1. **Complete Consumer**: Implement full data fetching in `WebhookTaskConsumer`
2. **Capture Helpers**: Create functions to get payloads from both implementations
3. **Full Validation**: Run actual payload comparisons for all 11 events
4. **Edge Cases**: Test null values, optional fields, version handling

## Test Coverage

### 11 Trigger Events
1. ✅ `BOOKING_CREATED` - Scaffold ready
2. ✅ `BOOKING_CANCELLED` - Scaffold ready
3. ✅ `BOOKING_RESCHEDULED` - Scaffold ready
4. ✅ `BOOKING_CONFIRMED` - Scaffold ready (uses `BOOKING_REQUESTED`)
5. ✅ `BOOKING_REJECTED` - Scaffold ready
6. ✅ `BOOKING_PAYMENT_INITIATED` - Scaffold ready
7. ✅ `BOOKING_PAID` - Scaffold ready
8. ✅ `BOOKING_NO_SHOW_UPDATED` - Scaffold ready
9. ✅ `FORM_SUBMITTED` - Scaffold ready
10. ✅ `RECORDING_READY` - Scaffold ready
11. ✅ `OOO_CREATED` - Scaffold ready

## Running Tests

```bash
# Run all webhook tests
yarn vitest packages/features/webhooks/lib/service/__tests__

# Run only payload compatibility tests
yarn vitest packages/features/webhooks/lib/service/__tests__/payload-compatibility.test.ts

# Watch mode
yarn vitest packages/features/webhooks/lib/service/__tests__ --watch
```

## Test Structure

### Fixtures (`fixtures.ts`)
Provides consistent test data:
- `createTestBooking()` - Sample booking data
- `createTestEventType()` - Sample event type
- `createTestUser()` - Sample user
- `createTestCalendarEvent()` - Sample calendar event
- `createTestWebhookSubscriber()` - Sample webhook subscription

### Compatibility Tests (`payload-compatibility.test.ts`)
For each trigger event:
1. **Current Implementation**: Get payload from existing service
2. **Producer/Consumer**: Get payload from new pattern
3. **Compare**: Assert 100% match (excluding `timestamp`, `operationId`)
4. **Validate Fields**: Ensure all required fields present

### Comparison Pattern

```typescript
const currentPayload = await getCurrentImplementationPayload(testData);
const newPayload = await getProducerConsumerPayload(testData);

// Compare (excluding dynamic fields)
expect(omit(newPayload, ["timestamp", "operationId"]))
  .toMatchObject(omit(currentPayload, ["timestamp", "operationId"]));

// Verify structure
expect(newPayload).toHaveProperty("triggerEvent");
expect(newPayload).toHaveProperty("booking.id");
expect(newPayload).toHaveProperty("eventType.id");
```

## Current Status (Phase 0)

**✅ Ready**: Test infrastructure established  
**⏳ Pending**: Full Consumer implementation  
**⏳ Pending**: Actual payload validation  

## Blocker Resolution

**Before wiring Phases 1-5**, we must:
1. Complete `WebhookTaskConsumer` data fetching
2. Run all 11 payload comparison tests
3. Achieve 100% pass rate
4. Document any intentional differences

## Future Enhancements

- Add performance benchmarks (current vs new)
- Test retry behavior
- Test error handling
- Test webhook versioning compatibility
- Add E2E tests with real HTTP delivery
