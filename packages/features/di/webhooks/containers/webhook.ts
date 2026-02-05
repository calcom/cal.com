import type { WebhookFeature } from "@calcom/features/webhooks/lib/facade/WebhookFeature";
import type { IWebhookRepository } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import type {
  IBookingWebhookService,
  IFormWebhookService,
  IOOOWebhookService,
  IRecordingWebhookService,
  IWebhookService,
} from "@calcom/features/webhooks/lib/interface/services";
import type { IWebhookProducerService } from "@calcom/features/webhooks/lib/interface/WebhookProducerService";
import type { IWebhookNotifier } from "@calcom/features/webhooks/lib/interface/webhook";
import type { WebhookTaskConsumer } from "@calcom/features/webhooks/lib/service/WebhookTaskConsumer";
import { type Container, createContainer } from "@evyweb/ioctopus";
import { moduleLoader as prismaModuleLoader } from "../../modules/Prisma";
import { moduleLoader as loggerModuleLoader } from "../../shared/services/logger.service";
import { taskerServiceModule } from "../../shared/services/tasker.service";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { bookingWebhookDataFetcherModule } from "../modules/BookingWebhookDataFetcher.module";
import { formWebhookDataFetcherModule } from "../modules/FormWebhookDataFetcher.module";
import { oooWebhookDataFetcherModule } from "../modules/OOOWebhookDataFetcher.module";
import { paymentWebhookDataFetcherModule } from "../modules/PaymentWebhookDataFetcher.module";
import { recordingWebhookDataFetcherModule } from "../modules/RecordingWebhookDataFetcher.module";
import { webhookModule } from "../modules/Webhook.module";
import { moduleLoader as webhookProducerServiceModuleLoader } from "../modules/WebhookProducerService.module";
import { webhookTaskConsumerModule } from "../modules/WebhookTaskConsumer.module";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

const webhookContainer: Container = createContainer();

// Load shared infrastructure
loggerModuleLoader.loadModule(webhookContainer);
prismaModuleLoader.loadModule(webhookContainer);
webhookContainer.load(SHARED_TOKENS.TASKER, taskerServiceModule);

// Load webhook module (includes cross-table repositories + all webhook services)
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_EVENT_TYPE_REPOSITORY, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_USER_REPOSITORY, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.OOO_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.PAYLOAD_BUILDER_FACTORY, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_NOTIFICATION_HANDLER, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER, webhookModule);

// Load Data Fetchers (Strategy Pattern implementations)
webhookContainer.load(WEBHOOK_TOKENS.BOOKING_DATA_FETCHER, bookingWebhookDataFetcherModule);
webhookContainer.load(WEBHOOK_TOKENS.PAYMENT_DATA_FETCHER, paymentWebhookDataFetcherModule);
webhookContainer.load(WEBHOOK_TOKENS.FORM_DATA_FETCHER, formWebhookDataFetcherModule);
webhookContainer.load(WEBHOOK_TOKENS.RECORDING_DATA_FETCHER, recordingWebhookDataFetcherModule);
webhookContainer.load(WEBHOOK_TOKENS.OOO_DATA_FETCHER, oooWebhookDataFetcherModule);

// Load Producer/Consumer modules
// Use moduleLoader pattern for producer service to load WebhookTasker dependencies
webhookProducerServiceModuleLoader.loadModule(webhookContainer);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER, webhookTaskConsumerModule);

export { webhookContainer };

/**
 * Get the Webhook Task Consumer.
 *
 * This is used internally by the tasker handler (`webhookDelivery.ts`).
 * For application code, use `getWebhookFeature().consumer` instead.
 */
export function getWebhookTaskConsumer(): WebhookTaskConsumer {
  return webhookContainer.get<WebhookTaskConsumer>(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER);
}

/**
 * Get the complete Webhook Feature facade (RECOMMENDED).
 *
 * This is the primary interface for webhook functionality.
 * It provides access to all webhook services through a unified, type-safe API.
 *
 * Usage:
 * ```typescript
 * import { getWebhookFeature } from "@calcom/features/di/webhooks/containers/webhook";
 *
 * const webhooks = getWebhookFeature();
 *
 * // Queue a webhook (lightweight - Producer pattern)
 * await webhooks.producer.queueBookingCreatedWebhook({ ... });
 *
 * // Or use event-specific services (legacy - will be deprecated in Phase 6)
 * await webhooks.booking.emitBookingCreated({ ... });
 * ```
 */
export function getWebhookFeature(): WebhookFeature {
  return {
    producer: webhookContainer.get<IWebhookProducerService>(WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE),
    consumer: webhookContainer.get<WebhookTaskConsumer>(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER),
    core: webhookContainer.get<IWebhookService>(WEBHOOK_TOKENS.WEBHOOK_SERVICE),
    booking: webhookContainer.get<IBookingWebhookService>(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE),
    form: webhookContainer.get<IFormWebhookService>(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE),
    recording: webhookContainer.get<IRecordingWebhookService>(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE),
    ooo: webhookContainer.get<IOOOWebhookService>(WEBHOOK_TOKENS.OOO_WEBHOOK_SERVICE),
    notifier: webhookContainer.get<IWebhookNotifier>(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER),
    repository: webhookContainer.get<IWebhookRepository>(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY),
  };
}

/**
 * Get only the webhook producer service
 *
 * Use this when you only need to queue webhooks, not consume or manage them.
 * Lighter import footprint for better tree-shaking and faster module loading.
 *
 * Benefits:
 * - Interface Segregation Principle: Import only what you need
 * - Smaller bundle size: Avoid loading entire facade
 * - Clearer intent: "I'm only queueing webhooks"
 *
 * Usage:
 * ```typescript
 * import { getWebhookProducer } from "@calcom/features/di/webhooks";
 *
 * const producer = getWebhookProducer();
 * await producer.queueBookingCreatedWebhook({
 *   bookingUid: booking.uid,
 *   eventTypeId: eventType.id,
 *   userId: user.id,
 * });
 * ```
 *
 * @returns Lightweight webhook producer service (no heavy dependencies)
 */
export function getWebhookProducer(): IWebhookProducerService {
  return webhookContainer.get<IWebhookProducerService>(WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE);
}
