import { createModule } from "@evyweb/ioctopus";

import type { IWebhookRepository } from "../../interface/repository";
import type { IWebhookNotifier } from "../../interface/webhook";
import { BookingWebhookService } from "../../service/BookingWebhookService";
import { FormWebhookService } from "../../service/FormWebhookService";
import { OOOWebhookService } from "../../service/OOOWebhookService";
import { RecordingWebhookService } from "../../service/RecordingWebhookService";
import { WebhookService } from "../../service/WebhookService";
import { WEBHOOK_DI_TOKENS } from "../tokens";

export const webhookServicesModule = createModule();

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE)
  .toClass(WebhookService, [WEBHOOK_DI_TOKENS.WEBHOOK_REPOSITORY, WEBHOOK_DI_TOKENS.TASKER]);

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.BOOKING_WEBHOOK_SERVICE)
  .toClass(BookingWebhookService, [
    WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER,
    WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE,
    WEBHOOK_DI_TOKENS.TASKER,
  ]);

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.FORM_WEBHOOK_SERVICE)
  .toClass(FormWebhookService, [WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER, WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE]);

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.RECORDING_WEBHOOK_SERVICE)
  .toClass(RecordingWebhookService, [WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER]);

webhookServicesModule
  .bind(WEBHOOK_DI_TOKENS.OOO_WEBHOOK_SERVICE)
  .toFactory(({ resolve }: { resolve: <T>(token: symbol) => T }) => {
    const notifier = resolve<IWebhookNotifier>(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER);
    const repository = resolve<IWebhookRepository>(WEBHOOK_DI_TOKENS.WEBHOOK_REPOSITORY);

    return new OOOWebhookService(notifier, repository);
  });
