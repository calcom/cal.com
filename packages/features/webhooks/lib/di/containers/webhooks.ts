import { createContainer } from "@evyweb/ioctopus";

import { webhookFactoryModule } from "../modules/factories";
import { infrastructureModule } from "../modules/infrastructure";
import { webhookRepositoryModule } from "../modules/repository";
import { webhookServicesModule } from "../modules/services";
import { WEBHOOK_DI_TOKENS } from "../tokens";

export const webhookContainer = createContainer();

webhookContainer.load(WEBHOOK_DI_TOKENS.TASKER, infrastructureModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.WEBHOOK_REPOSITORY, webhookRepositoryModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE, webhookServicesModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.BOOKING_WEBHOOK_SERVICE, webhookServicesModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER, webhookFactoryModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.WEBHOOK_PAYLOAD_FACTORY, webhookFactoryModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFICATION_HANDLER, webhookFactoryModule);

export function getBookingWebhookService() {
  return webhookContainer.get(WEBHOOK_DI_TOKENS.BOOKING_WEBHOOK_SERVICE);
}
