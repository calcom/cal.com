import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { UsersRepository } from "@calcom/features/users/users.repository";
import { createPayloadBuilderFactory } from "@calcom/features/webhooks/lib/factory/versioned/registry";
import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import { BookingWebhookService } from "@calcom/features/webhooks/lib/service/BookingWebhookService";
import { FormWebhookService } from "@calcom/features/webhooks/lib/service/FormWebhookService";
import { OOOWebhookService } from "@calcom/features/webhooks/lib/service/OOOWebhookService";
import { RecordingWebhookService } from "@calcom/features/webhooks/lib/service/RecordingWebhookService";
import { WebhookNotificationHandler } from "@calcom/features/webhooks/lib/service/WebhookNotificationHandler";
import { WebhookNotifier } from "@calcom/features/webhooks/lib/service/WebhookNotifier";
import { WebhookService } from "@calcom/features/webhooks/lib/service/WebhookService";
import { createModule } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { DI_TOKENS } from "../../tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

const webhookModule = createModule();

// Bind cross-table repositories (used by WebhookRepository)
webhookModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_EVENT_TYPE_REPOSITORY)
  .toClass(EventTypeRepository, [DI_TOKENS.PRISMA_CLIENT]);

webhookModule.bind(WEBHOOK_TOKENS.WEBHOOK_USER_REPOSITORY).toClass(UsersRepository, []);

// Bind webhook repository with dependencies (Repository Pattern compliance)
webhookModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY)
  .toClass(WebhookRepository, [
    DI_TOKENS.PRISMA_CLIENT,
    WEBHOOK_TOKENS.WEBHOOK_EVENT_TYPE_REPOSITORY,
    WEBHOOK_TOKENS.WEBHOOK_USER_REPOSITORY,
  ]);

// Bind services
webhookModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_SERVICE)
  .toClass(WebhookService, [WEBHOOK_TOKENS.WEBHOOK_REPOSITORY, SHARED_TOKENS.TASKER, SHARED_TOKENS.LOGGER]);

webhookModule
  .bind(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE)
  .toClass(BookingWebhookService, [
    WEBHOOK_TOKENS.WEBHOOK_NOTIFIER,
    WEBHOOK_TOKENS.WEBHOOK_SERVICE,
    SHARED_TOKENS.TASKER,
    SHARED_TOKENS.LOGGER,
  ]);

webhookModule
  .bind(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE)
  .toClass(FormWebhookService, [WEBHOOK_TOKENS.WEBHOOK_NOTIFIER, WEBHOOK_TOKENS.WEBHOOK_SERVICE]);

webhookModule
  .bind(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE)
  .toClass(RecordingWebhookService, [WEBHOOK_TOKENS.WEBHOOK_NOTIFIER]);

webhookModule
  .bind(WEBHOOK_TOKENS.OOO_WEBHOOK_SERVICE)
  .toClass(OOOWebhookService, [
    WEBHOOK_TOKENS.WEBHOOK_NOTIFIER,
    WEBHOOK_TOKENS.WEBHOOK_REPOSITORY,
    SHARED_TOKENS.TASKER,
    SHARED_TOKENS.LOGGER,
  ]);

// Bind payload builder factory (composition root for versioning)
webhookModule.bind(WEBHOOK_TOKENS.PAYLOAD_BUILDER_FACTORY).toFactory(() => createPayloadBuilderFactory());

// Bind notification handler with factory
webhookModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_NOTIFICATION_HANDLER)
  .toClass(WebhookNotificationHandler, [
    WEBHOOK_TOKENS.WEBHOOK_SERVICE,
    WEBHOOK_TOKENS.PAYLOAD_BUILDER_FACTORY,
    SHARED_TOKENS.LOGGER,
  ]);

// Bind notifier
webhookModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER)
  .toClass(WebhookNotifier, [WEBHOOK_TOKENS.WEBHOOK_NOTIFICATION_HANDLER, SHARED_TOKENS.LOGGER]);

export { webhookModule };
