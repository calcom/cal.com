# Webhook System Migration Guide

## Overview

This document outlines the migration from the legacy webhook system to the new **Dependency Injection (DI) based architecture** using `evyweb/ioctopus`. The new system provides better testability, maintainability, and scalability.

---

## 🏗️ New DI Architecture

### Directory Structure

```
packages/features/webhooks/lib/
├── 📋 dto/                    # Data Transfer Objects (NEW DI)
│   ├── types.ts              # All webhook event DTOs
│   └── index.ts              # DTO exports
├── 🔌 interface/             # DI Contracts (NEW DI)
│   ├── factory.ts            # IWebhookPayloadFactory
│   ├── infrastructure.ts     # ITasker interface
│   ├── repository.ts         # IWebhookRepository
│   ├── services.ts           # All service interfaces
│   ├── webhook.ts            # IWebhookNotifier
│   └── index.ts              # Interface exports
├── 💾 repository/            # Data Access (NEW DI)
│   ├── WebhookRepository.ts  # Instance-based repository
│   ├── types.ts              # Repository types
│   └── index.ts              # Repository exports
├── 🎯 service/               # Business Logic (NEW DI)
│   ├── BookingWebhookService.ts      # Instance-based
│   ├── FormWebhookService.ts         # Instance-based
│   ├── RecordingWebhookService.ts    # Instance-based
│   ├── OOOWebhookService.ts          # Instance-based
│   ├── WebhookService.ts             # Instance-based
│   ├── WebhookNotifier.ts            # Instance-based
│   └── WebhookNotificationHandler.ts # Instance-based
├── 🏗️ factory/              # Payload Builders (NEW DI)
│   ├── WebhookPayloadFactory.ts      # Main factory (instance-based)
│   ├── BookingPayloadBuilder.ts      # Booking payloads
│   ├── FormPayloadBuilder.ts         # Form payloads
│   ├── RecordingPayloadBuilder.ts    # Recording payloads
│   ├── MeetingPayloadBuilder.ts      # Meeting payloads
│   ├── InstantMeetingBuilder.ts      # Instant meeting payloads
│   ├── OOOPayloadBuilder.ts          # OOO payloads
│   ├── BookingWebhookServiceFactory.ts # Non-DI factory
│   ├── types.ts                      # Payload interfaces
│   └── index.ts                      # Factory exports
├── 🚀 provider/              # Async Dependencies (NEW DI)
│   ├── TaskerProvider.ts     # Async tasker loading
│   └── index.ts              # Provider exports
├── 📊 types/                 # Parameter Types (NEW DI)
│   ├── params.ts             # Service parameter types
│   └── index.ts              # Type exports
├── 🎛️ di/                   # Ioctopus DI Structure (NEW DI)
│   ├── tokens.ts             # DI tokens
│   ├── modules/              # Ioctopus modules
│   │   ├── infrastructure.ts # Infrastructure bindings
│   │   ├── services.ts       # Service bindings
│   │   ├── repository.ts     # Repository bindings
│   │   └── factories.ts      # Factory bindings
│   └── containers/           # Service resolution
│       └── webhooks.ts       # Main container
├── 🧪 test/                  # Testing (NEW DI)
│   └── webhooks.test.ts      # Unit tests
└── ❌ LEGACY FILES (to be removed post migration):
    ├── handleWebhookScheduledTriggers.ts
    ├── schedulePayload.ts
    ├── scheduleTrigger.ts
    ├── sendOrSchedulePayload.ts
    ├── sendPayload.ts
    ├── WebhookService.ts
    └── WebhookService.test.ts
```

### Files by Category

#### ✅ **NEW DI ARCHITECTURE FILES** (Using evyweb/ioctopus)

**Core DI Infrastructure:**
- `di/tokens.ts` - DI token definitions
- `di/modules/infrastructure.ts` - Infrastructure bindings
- `di/modules/services.ts` - Service bindings  
- `di/modules/repository.ts` - Repository bindings
- `di/modules/factories.ts` - Factory bindings
- `di/containers/webhooks.ts` - Service resolution

**DTOs & Interfaces:**
- `dto/types.ts` - All webhook event DTOs
- `dto/index.ts` - DTO exports
- `interface/factory.ts` - IWebhookPayloadFactory
- `interface/infrastructure.ts` - ITasker interface
- `interface/repository.ts` - IWebhookRepository
- `interface/services.ts` - All service interfaces
- `interface/webhook.ts` - IWebhookNotifier
- `interface/index.ts` - Interface exports

**Instance-Based Services:**
- `service/BookingWebhookService.ts` - DI-compliant
- `service/FormWebhookService.ts` - DI-compliant
- `service/RecordingWebhookService.ts` - DI-compliant
- `service/OOOWebhookService.ts` - DI-compliant
- `service/WebhookService.ts` - DI-compliant
- `service/WebhookNotifier.ts` - DI-compliant
- `service/WebhookNotificationHandler.ts` - DI-compliant

**Payload Builders:**
- `factory/WebhookPayloadFactory.ts` - Main factory (DI-compliant)
- `factory/BookingPayloadBuilder.ts` - DI-compliant
- `factory/FormPayloadBuilder.ts` - DI-compliant
- `factory/RecordingPayloadBuilder.ts` - DI-compliant
- `factory/MeetingPayloadBuilder.ts` - DI-compliant
- `factory/InstantMeetingBuilder.ts` - DI-compliant
- `factory/OOOPayloadBuilder.ts` - DI-compliant
- `factory/types.ts` - Payload interfaces

**Repository & Infrastructure:**
- `repository/WebhookRepository.ts` - DI-compliant
- `repository/types.ts` - Repository types
- `provider/TaskerProvider.ts` - Async dependency provider
- `types/params.ts` - Parameter types

#### ❌ **LEGACY FILES** (To be removed after migration)

**Root-level Legacy Files:**
- `constants.ts` - Webhook constants (UTILITY - keep)
- `getNewWebhookUrl.ts` - URL helper (UTILITY - keep)
- `getWebhooks.ts` - Database query helper (UTILITY - keep)
- `handleWebhookScheduledTriggers.ts` - Scheduled trigger handler (LEGACY)
- `schedulePayload.ts` - Payload scheduling (LEGACY)
- `scheduleTrigger.ts` - Trigger scheduling (LEGACY)
- `sendOrSchedulePayload.ts` - Payload sender (LEGACY)
- `sendPayload.ts` - Direct payload sender (LEGACY)
- `subscriberUrlReserved.ts` - URL validation (UTILITY - keep)
- `integrationTemplate.tsx` - Template integration (UTILITY - keep)
- `WebhookService.test.ts` - Legacy tests (LEGACY)
- `WebhookService.ts` - Legacy static service (LEGACY)

**Non-DI Factory:**
- `factory/BookingWebhookServiceFactory.ts` - Non-DI factory (keep for compatibility)

---

## 🔄 New Webhook Flow

### Detailed Flow Steps

#### 1. **Event Trigger** 
```typescript
// Example: Booking created
const bookingService = getBookingWebhookService();
await bookingService.emitBookingCreated({
  booking: { id: 123, eventTypeId: 456 },
  evt: calendarEvent,
  eventType: eventTypeInfo
});
```

#### 2. **DTO Creation**
```typescript
// Inside BookingWebhookService
const dto: BookingCreatedDTO = {
  triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
  createdAt: new Date().toISOString(),
  bookingId: booking.id,
  eventTypeId: booking.eventTypeId,
  // ... other fields
};
```

#### 3. **Webhook Emission**
```typescript
// WebhookNotifier (injected)
await this.webhookNotifier.emitWebhook(dto, isDryRun);
```

#### 4. **Notification Handling**
```typescript
// WebhookNotificationHandler
async handleNotification(dto: WebhookEventDTO, isDryRun = false) {
  const payload = this.payloadFactory.createPayload(dto);
  await this.webhookService.sendWebhooks(dto.triggerEvent, payload, {
    // ... webhook options
  });
}
```

#### 5. **Payload Creation**
```typescript
// WebhookPayloadFactory with injected builders
createPayload(dto: WebhookEventDTO): WebhookPayload {
  switch (dto.triggerEvent) {
    case WebhookTriggerEvents.BOOKING_CREATED:
      return this.bookingPayloadBuilder.build(dto as BookingCreatedDTO);
    // ... other cases
  }
}
```

#### 6. **HTTP Delivery**
```typescript
// WebhookService
async sendWebhooks(triggerEvent, payload, options) {
  const webhooks = await this.repository.getWebhooks(options);
  // Send to each webhook endpoint
}
```

---

## 🔄 Migration from Legacy to New DI

### Before (Legacy)
```typescript
// Legacy webhook delivery pattern
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendOrSchedulePayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";

// 1. Get webhooks from database
const webhooks = await getWebhooks({
  userId: booking.userId,
  eventTypeId: booking.eventTypeId,
  triggerEvent: WebhookTriggerEvents.BOOKING_CREATED
});

// 2. Create payload manually
const payload = {
  triggerEvent: "BOOKING_CREATED",
  createdAt: new Date().toISOString(),
  payload: {
    // Manual payload construction
    bookingId: booking.id,
    startTime: booking.startTime,
    endTime: booking.endTime,
    // ... many manual fields
  }
};

// 3. Send to each webhook manually
for (const webhook of webhooks) {
  await sendOrSchedulePayload(
    webhook.secret,
    "BOOKING_CREATED",
    new Date().toISOString(),
    webhook,
    payload
  );
}

// OR using legacy WebhookService (static initialization)
const service = await WebhookService.init({
  triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
  userId: booking.userId,
  eventTypeId: booking.eventTypeId
});
await service.sendPayload(payload);
```

### After (New DI)
```typescript
// DI container resolution
import { getBookingWebhookService } from "@calcom/features/webhooks/lib/di/containers/webhooks";

// Instance-based calls
const bookingService = getBookingWebhookService();
await bookingService.emitBookingCreated({
  booking: { id: 123, eventTypeId: 456 },
  evt: calendarEvent,
  eventType: eventTypeInfo
});
```

### Service Resolution Examples
```typescript
// Get services from DI container
const bookingService = getBookingWebhookService();
const formService = getFormWebhookService();
const recordingService = getRecordingWebhookService();
const notifier = getWebhookNotifier();
const payloadFactory = getWebhookPayloadFactory();
```

---

## 🚀 Adding a New Webhook Trigger

### Example: Adding "EXAMPLE_TRIGGER"

#### Step 1: Add to Prisma Enum
```prisma
enum WebhookTriggerEvents {
  // ... existing events
  EXAMPLE_TRIGGER
}
```

#### Step 2: Create DTO
```typescript
// dto/types.ts
export interface ExampleTriggerDTO extends BaseWebhookEventDTO<typeof WebhookTriggerEvents.EXAMPLE_TRIGGER> {
  exampleData: string;
  exampleId: number;
}

// Add to union type
export type WebhookEventDTO = 
  | BookingCreatedDTO
  | BookingCancelledDTO
  // ... existing DTOs
  | ExampleTriggerDTO;
```

#### Step 3: Create Payload Interface
```typescript
// factory/types.ts
export interface ExampleTriggerPayload {
  exampleData: string;
  exampleId: number;
  processedAt: string;
}

// Add to union type
export type WebhookPayload = {
  triggerEvent: string;
  createdAt: string;
  payload: EventPayloadType | OOOEntryPayloadType | ExampleTriggerPayload | /* ... */;
};
```

#### Step 4: Create Payload Builder
```typescript
// factory/ExamplePayloadBuilder.ts
export class ExamplePayloadBuilder implements WebhookPayloadBuilder {
  build(dto: ExampleTriggerDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: {
        exampleData: dto.exampleData,
        exampleId: dto.exampleId,
        processedAt: new Date().toISOString(),
      },
    };
  }
}
```

#### Step 5: Register in DI System
```typescript
// di/tokens.ts
export const WEBHOOK_DI_TOKENS = {
  // ... existing tokens
  EXAMPLE_PAYLOAD_BUILDER: Symbol("ExamplePayloadBuilder"),
};

// di/modules/factories.ts
webhookFactoryModule
  .bind(WEBHOOK_DI_TOKENS.EXAMPLE_PAYLOAD_BUILDER)
  .toClass(ExamplePayloadBuilder);

// Update WebhookPayloadFactory binding
webhookFactoryModule
  .bind(WEBHOOK_DI_TOKENS.WEBHOOK_PAYLOAD_FACTORY)
  .toClass(WebhookPayloadFactory, [
    // ... existing builders
    WEBHOOK_DI_TOKENS.EXAMPLE_PAYLOAD_BUILDER,
  ]);

// di/containers/webhooks.ts
webhookContainer.load(WEBHOOK_DI_TOKENS.EXAMPLE_PAYLOAD_BUILDER, webhookFactoryModule);
```

#### Step 6: Update WebhookPayloadFactory
```typescript
// factory/WebhookPayloadFactory.ts
export class WebhookPayloadFactory implements IWebhookPayloadFactory {
  constructor(
    // ... existing builders
    private readonly examplePayloadBuilder: ExamplePayloadBuilder
  ) {}

  createPayload(dto: WebhookEventDTO): WebhookPayload {
    switch (dto.triggerEvent) {
      // ... existing cases
      case WebhookTriggerEvents.EXAMPLE_TRIGGER:
        return this.examplePayloadBuilder.build(dto as ExampleTriggerDTO);
    }
  }
}
```

#### Step 7: Add Service Method
```typescript
// service/ExampleWebhookService.ts or add to existing service
export class ExampleWebhookService implements IExampleWebhookService {
  constructor(private readonly webhookNotifier: IWebhookNotifier) {}

  async emitExampleTrigger(params: {
    exampleData: string;
    exampleId: number;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: ExampleTriggerDTO = {
      triggerEvent: WebhookTriggerEvents.EXAMPLE_TRIGGER,
      createdAt: new Date().toISOString(),
      exampleData: params.exampleData,
      exampleId: params.exampleId,
    };

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }
}
```

#### Step 8: Update Constants
```typescript
// constants.ts
export const WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP = {
  core: [
    // ... existing events
    WebhookTriggerEvents.EXAMPLE_TRIGGER,
  ] as const,
};
```

### ✅ **That's it!** The new trigger is fully integrated with:
- ✅ Type-safe DTOs
- ✅ Dedicated payload builder
- ✅ Full DI integration
- ✅ Service methods
- ✅ Automatic payload creation
- ✅ HTTP delivery

---

## 🗑️ Legacy Code Removal Plan

### Phase 1: High Priority Removals
```typescript
// These files should be removed once migration is complete:
- handleWebhookScheduledTriggers.ts  // Replaced by WebhookService + trigger.dev
- schedulePayload.ts                 // Replaced by WebhookService
- scheduleTrigger.ts                 // Replaced by WebhookService  
- sendOrSchedulePayload.ts           // Replaced by WebhookService
- sendPayload.ts                     // Replaced by WebhookService
- WebhookService.ts (root)           // Replaced by service/WebhookService.ts
- WebhookService.test.ts (root)      // Replaced by test/webhooks.test.ts
```

### Phase 2: Utility Files (Keep/Refactor)
```typescript
// These files provide utility functions and should be kept:
- constants.ts                       // KEEP - Webhook constants
- getNewWebhookUrl.ts               // KEEP - URL helper
- getWebhooks.ts                    // KEEP - Database query helper  
- subscriberUrlReserved.ts          // KEEP - URL validation
- integrationTemplate.tsx           // KEEP - Template integration
```

### Phase 3: Legacy Integration Points
```typescript
// Files that need to be updated to use new DI system:
- Any imports of legacy WebhookNotifier
- Any static calls to BookingWebhookFactory  
- Any direct imports of sendPayload/schedulePayload
- Any usage of legacy WebhookService class
```

---

## 🧪 Testing Strategy

### Unit Testing with DI
```typescript
// Easy mocking with DI
const mockNotifier: IWebhookNotifier = {
  emitWebhook: vi.fn()
};

const service = new BookingWebhookService(mockNotifier, mockWebhookService);
await service.emitBookingCreated(params);

expect(mockNotifier.emitWebhook).toHaveBeenCalledWith(expectedDTO);
```

### Integration Testing
```typescript
// Use DI container for integration tests
const bookingService = getBookingWebhookService();
// Test full flow
```

---

## 📊 Migration Progress

- [x] DI Infrastructure (tokens, modules, containers)
- [x] All DTO definitions (18 trigger events)
- [x] All service interfaces
- [x] Instance-based services (7 services)
- [x] Payload builders (6 builders)
- [x] WebhookPayloadFactory with full DI
- [x] Repository pattern
- [x] Provider pattern for async dependencies

---

## 🎯 Benefits of New Architecture

### 🔧 **Developer Experience**
- **Type Safety**: Full TypeScript support with strict typing
- **Testability**: Easy mocking and unit testing
- **IDE Support**: Better autocomplete and refactoring
- **Debugging**: Clear dependency graph and error tracking

### 🏗️ **Architecture**
- **Separation of Concerns**: Clear boundaries between layers
- **Scalability**: Easy to add new webhook triggers
- **Maintainability**: Consistent patterns across all services
- **Flexibility**: Easy to swap implementations

### 🚀 **Performance**
- **Lazy Loading**: Services loaded only when needed
- **Caching**: Repository pattern enables caching
- **Async**: Full async/await support throughout
- **Error Handling**: Centralized error handling and logging

---

## 🔗 Integration Points

### Current Codebase Integration
```typescript
// Replace legacy imports
- import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
- import sendOrSchedulePayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
+ import { getBookingWebhookService } from "@calcom/features/webhooks/lib/di/containers/webhooks";

// Replace manual webhook flow
- const webhooks = await getWebhooks({ userId, eventTypeId, triggerEvent });
- const payload = { /* manual construction */ };
- for (const webhook of webhooks) {
-   await sendOrSchedulePayload(webhook.secret, triggerEvent, createdAt, webhook, payload);
- }
+ const service = getBookingWebhookService();
+ await service.emitBookingCreated({ booking, evt, eventType });
```

### External Dependencies
- **trigger.dev**: For webhook retry/delay/timeout handling
- **Prisma**: For database operations via repository pattern
- **evyweb/ioctopus**: For dependency injection container

---

This migration guide ensures a smooth transition from the legacy webhook system to the new DI-based architecture, providing better maintainability, testability, and scalability for the Cal.com webhook system.
