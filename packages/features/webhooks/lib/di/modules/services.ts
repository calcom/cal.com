import { createModule } from "@evyweb/ioctopus";

import { BookingWebhookService } from "../../service/BookingWebhookService";
import { FormWebhookService } from "../../service/FormWebhookService";
import { OOOWebhookService } from "../../service/OOOWebhookService";
import { RecordingWebhookService } from "../../service/RecordingWebhookService";
import { WebhookService } from "../../service/WebhookService";
import { WEBHOOK_DI_TOKENS } from "../tokens";

export const webhookServicesModule = createModule();

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE)
  .toClass(WebhookService, [
    WEBHOOK_DI_TOKENS.WEBHOOK_REPOSITORY,
    WEBHOOK_DI_TOKENS.TASKER,
    WEBHOOK_DI_TOKENS.LOGGER,
  ]);

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.BOOKING_WEBHOOK_SERVICE)
  .toClass(BookingWebhookService, [
    WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER,
    WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE,
    WEBHOOK_DI_TOKENS.TASKER,
    WEBHOOK_DI_TOKENS.LOGGER,
  ]);

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.FORM_WEBHOOK_SERVICE)
  .toClass(FormWebhookService, [WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER, WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE]);

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.RECORDING_WEBHOOK_SERVICE)
  .toClass(RecordingWebhookService, [WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER]);

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.OOO_WEBHOOK_SERVICE)
  .toClass(OOOWebhookService, [
    WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER,
    WEBHOOK_DI_TOKENS.WEBHOOK_REPOSITORY,
    WEBHOOK_DI_TOKENS.TASKER,
    WEBHOOK_DI_TOKENS.LOGGER,
  ]);
