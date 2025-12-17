import { createContainer } from "@evyweb/ioctopus";

import type {
  IBookingWebhookService,
  IFormWebhookService,
  IRecordingWebhookService,
  IWebhookService,
} from "@calcom/features/webhooks/lib/interface/services";
import type { IWebhookRepository } from "@calcom/features/webhooks/lib/interface/repository";
import type { IWebhookNotifier } from "@calcom/features/webhooks/lib/interface/webhook";
import type { WebhookFeature } from "@calcom/features/webhooks/lib/facade/WebhookFeature";
import type { OOOWebhookService } from "@calcom/features/webhooks/lib/service/OOOWebhookService";

import { moduleLoader as loggerModuleLoader } from "../../shared/services/logger.service";
import { moduleLoader as prismaModuleLoader } from "../../modules/Prisma";
import { taskerServiceModule } from "../../shared/services/tasker.service";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";
import { webhookModule } from "../modules/Webhook.module";
import { webhookProducerServiceModule } from "../modules/WebhookProducerService.module";
import { webhookTaskConsumerModule } from "../modules/WebhookTaskConsumer.module";
import type { IWebhookProducerService } from "@calcom/features/webhooks/lib/interface/WebhookProducerService";
import type { WebhookTaskConsumer } from "@calcom/features/webhooks/lib/service/WebhookTaskConsumer";

export const webhookContainer = createContainer();

// Load shared infrastructure
loggerModuleLoader.loadModule(webhookContainer);
prismaModuleLoader.loadModule(webhookContainer);
webhookContainer.load(SHARED_TOKENS.TASKER, taskerServiceModule);

// Load webhook module
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.OOO_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.BOOKING_PAYLOAD_BUILDER, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.FORM_PAYLOAD_BUILDER, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.OOO_PAYLOAD_BUILDER, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.RECORDING_PAYLOAD_BUILDER, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.MEETING_PAYLOAD_BUILDER, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.INSTANT_MEETING_BUILDER, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_NOTIFICATION_HANDLER, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER, webhookModule);

// Load Producer/Consumer modules
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE, webhookProducerServiceModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER, webhookTaskConsumerModule);

// Service getters (DEPRECATED: Use getWebhookFeature() facade instead)
// These will be kept for backward compatibility during migration
export function getBookingWebhookService(): IBookingWebhookService {
  return webhookContainer.get<IBookingWebhookService>(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE);
}

export function getFormWebhookService(): IFormWebhookService {
  return webhookContainer.get<IFormWebhookService>(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE);
}

export function getRecordingWebhookService(): IRecordingWebhookService {
  return webhookContainer.get<IRecordingWebhookService>(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE);
}

export function getWebhookNotifier(): IWebhookNotifier {
  return webhookContainer.get<IWebhookNotifier>(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER);
}

/**
 * Get the Webhook Producer Service.
 * 
 * This is the lightweight service for queueing webhook delivery tasks.
 * It has NO heavy dependencies (no Prisma, no repositories).
 */
export function getWebhookProducerService(): IWebhookProducerService {
  return webhookContainer.get<IWebhookProducerService>(WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE);
}

/**
 * Get the Webhook Task Consumer.
 * 
 * This is the heavy service for processing webhook delivery tasks.
 * It fetches data from database, builds payloads, and sends HTTP requests.
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
 * import { getWebhookFeature } from "@calcom/features/webhooks/di";
 * 
 * const webhooks = getWebhookFeature();
 * 
 * // Queue a webhook (lightweight)
 * await webhooks.producer.queueBookingCreatedWebhook({ ... });
 * 
 * // Or use event-specific services
 * await webhooks.booking.emitBookingCreated({ ... });
 * ```
 */
export function getWebhookFeature(): WebhookFeature {
  return {
    producer: getWebhookProducerService(),
    consumer: getWebhookTaskConsumer(),
    core: webhookContainer.get<IWebhookService>(WEBHOOK_TOKENS.WEBHOOK_SERVICE),
    booking: webhookContainer.get<IBookingWebhookService>(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE),
    form: webhookContainer.get<IFormWebhookService>(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE),
    recording: webhookContainer.get<IRecordingWebhookService>(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE),
    ooo: webhookContainer.get<OOOWebhookService>(WEBHOOK_TOKENS.OOO_WEBHOOK_SERVICE),
    notifier: webhookContainer.get<IWebhookNotifier>(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER),
    repository: webhookContainer.get<IWebhookRepository>(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY),
  };
}
