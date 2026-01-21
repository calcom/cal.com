import { createModule } from "@evyweb/ioctopus";

import { BookingWebhookService } from "@calcom/features/webhooks/lib/service/BookingWebhookService";
import { FormWebhookService } from "@calcom/features/webhooks/lib/service/FormWebhookService";
import { OOOWebhookService } from "@calcom/features/webhooks/lib/service/OOOWebhookService";
import { RecordingWebhookService } from "@calcom/features/webhooks/lib/service/RecordingWebhookService";
import { WebhookService } from "@calcom/features/webhooks/lib/service/WebhookService";

import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../webhooks.tokens";

export const webhookServicesModule = createModule();

webhookServicesModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_SERVICE)
  .toClass(WebhookService, [WEBHOOK_TOKENS.WEBHOOK_REPOSITORY, SHARED_TOKENS.TASKER, SHARED_TOKENS.LOGGER]);

webhookServicesModule
  .bind(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE)
  .toClass(BookingWebhookService, [
    WEBHOOK_TOKENS.WEBHOOK_NOTIFIER,
    WEBHOOK_TOKENS.WEBHOOK_SERVICE,
    SHARED_TOKENS.TASKER,
    SHARED_TOKENS.LOGGER,
  ]);

webhookServicesModule
  .bind(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE)
  .toClass(FormWebhookService, [WEBHOOK_TOKENS.WEBHOOK_NOTIFIER, WEBHOOK_TOKENS.WEBHOOK_SERVICE]);

webhookServicesModule
  .bind(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE)
  .toClass(RecordingWebhookService, [WEBHOOK_TOKENS.WEBHOOK_NOTIFIER]);

webhookServicesModule
  .bind(WEBHOOK_TOKENS.OOO_WEBHOOK_SERVICE)
  .toClass(OOOWebhookService, [
    WEBHOOK_TOKENS.WEBHOOK_NOTIFIER,
    WEBHOOK_TOKENS.WEBHOOK_REPOSITORY,
    SHARED_TOKENS.TASKER,
    SHARED_TOKENS.LOGGER,
  ]);
