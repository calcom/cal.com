# Webhook System Migration Guide

This guide helps you migrate from the old webhook system to the new architecture that enforces separation of concerns and promotes consistency.

## Overview of Changes

The new webhook architecture follows this flow:

1. **Business Event Trigger** → 2. **DTO Preparation** → 3. **Webhook Factory** → 4. **Webhook Notifier** → 5. **WebhookNotificationHandler** → 6. **Webhook Repository** → 7. **Webhook Service** → 8. **Webhook Delivery Service**

## Migration Steps

### 1. Replace Direct sendPayload Calls

**Before (Old):**
```typescript
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";

const subscribers = await getWebhooks({
  userId: booking.userId,
  eventTypeId: booking.eventTypeId,
  triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
  teamId: eventType?.teamId,
  orgId,
});

const promises = subscribers.map((sub) =>
  sendPayload(
    sub.secret,
    WebhookTriggerEvents.BOOKING_CREATED,
    new Date().toISOString(),
    sub,
    webhookPayload
  )
);
await Promise.all(promises);
```

**After (New):**
```typescript
import { BookingWebhookService } from "@calcom/features/webhooks/lib/service/BookingWebhookService";

await BookingWebhookService.emitBookingCreated({
  evt,
  booking: {
    id: booking.id,
    eventTypeId: booking.eventTypeId,
    userId: booking.userId,
    startTime: booking.startTime,
    smsReminderNumber: booking.smsReminderNumber,
  },
  eventType: {
    id: eventType.id,
    title: eventType.title,
    description: eventType.description,
    requiresConfirmation: eventType.requiresConfirmation,
    price: eventType.price,
    currency: eventType.currency,
    length: eventType.length,
  },
  status: "ACCEPTED",
  teamId,
  orgId,
});
```

### 2. Replace handleWebhookTrigger Usage

**Before (Old):**
```typescript
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { getWebhookPayloadForBooking } from "@calcom/features/bookings/lib/getWebhookPayloadForBooking";

const subscriberOptions = {
  userId: organizerUserId,
  eventTypeId,
  triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
  teamId,
  orgId,
  oAuthClientId: platformClientId,
};

const webhookData = getWebhookPayloadForBooking({ booking, evt });

await handleWebhookTrigger({
  subscriberOptions,
  eventTrigger: WebhookTriggerEvents.BOOKING_CREATED,
  webhookData,
  isDryRun,
});
```

**After (New):**
```typescript
import { BookingWebhookService } from "@calcom/features/webhooks/lib/service/BookingWebhookService";

await BookingWebhookService.emitBookingCreated({
  evt,
  booking,
  eventType,
  status: "ACCEPTED",
  teamId,
  orgId,
  platformParams: {
    platformClientId,
    platformRescheduleUrl,
    platformCancelUrl,
    platformBookingUrl,
  },
  isDryRun,
});
```

### 3. Available Service Methods

The `BookingWebhookService` provides these methods:

- `emitBookingCreated(params)` - For BOOKING_CREATED events
- `emitBookingCancelled(params)` - For BOOKING_CANCELLED events  
- `emitBookingRequested(params)` - For BOOKING_REQUESTED events
- `emitBookingRescheduled(params)` - For BOOKING_RESCHEDULED events
- `emitBookingPaid(params)` - For BOOKING_PAID events
- `emitBookingNoShow(params)` - For BOOKING_NO_SHOW_UPDATED events

### 4. Advanced Usage with WebhookNotifier

For custom webhook events or more control:

```typescript
import { WebhookNotifier } from "@calcom/features/webhooks/lib/notifier/WebhookNotifier";
import type { BookingCreatedDTO } from "@calcom/features/webhooks/lib/dto/types";

const dto: BookingCreatedDTO = {
  triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
  createdAt: new Date().toISOString(),
  bookingId: booking.id,
  eventTypeId: eventType?.id,
  userId: booking.userId,
  teamId,
  orgId,
  evt,
  eventType,
  booking,
  status: "ACCEPTED",
};

await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_CREATED, dto);
```

## Benefits of Migration

1. **Separation of Concerns**: Each component has a single responsibility
2. **Consistency**: All webhooks follow the same flow
3. **Better Error Handling**: Centralized error handling and logging
4. **Rate Limiting**: Built-in rate limiting to prevent overwhelming webhook endpoints
5. **Retry Logic**: Automatic retry with exponential backoff
6. **Delivery Logging**: Track webhook delivery success/failure
7. **Type Safety**: Strongly typed DTOs prevent runtime errors
8. **Testability**: Easy to mock and test individual components

## Backward Compatibility

The old system continues to work but will show deprecation warnings. You can migrate incrementally:

1. Start by replacing direct `sendPayload` calls with service methods
2. Replace `handleWebhookTrigger` usage with new service methods
3. Remove inline payload construction in favor of service methods
4. Eventually remove deprecated imports

## Testing

The new architecture makes testing much easier:

```typescript
import { WebhookNotifier } from "@calcom/features/webhooks/lib/notifier/WebhookNotifier";
import { WebhookNotificationHandler } from "@calcom/features/webhooks/lib/notifier/WebhookNotificationHandler";

// Mock the handler for testing
const mockHandler = new WebhookNotificationHandler();
WebhookNotifier.setHandler(mockHandler);

// Test webhook emission
await BookingWebhookService.emitBookingCreated(testParams);
```

## Files to Update

Common files that need migration:

- `packages/features/bookings/lib/handleNewBooking.ts`
- `packages/features/bookings/lib/handleCancelBooking.ts`
- `packages/features/bookings/lib/handleConfirmation.ts`
- `packages/features/bookings/lib/handleBookingRequested.ts`
- `packages/trpc/server/routers/viewer/bookings/confirm.handler.ts`
- `packages/trpc/server/routers/viewer/bookings/requestReschedule.handler.ts`
- Any other files that import `sendPayload` or `handleWebhookTrigger`

## Need Help?

If you encounter issues during migration, check:

1. Import paths are correct
2. DTO properties match your data structure
3. Service method parameters are complete
4. TypeScript errors are resolved

The old system will continue to work during the transition period.
