import { createContainer } from "@evyweb/ioctopus";

import { webhookFactoryModule } from "../modules/factories";
import { infrastructureModule } from "../modules/infrastructure";
import { webhookRepositoryModule } from "../modules/repository";
import { webhookServicesModule } from "../modules/services";
import { WEBHOOK_DI_TOKENS } from "../tokens";

export const webhookContainer = createContainer();

// Load infrastructure
webhookContainer.load(WEBHOOK_DI_TOKENS.TASKER, infrastructureModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.LOGGER, infrastructureModule);

// Load repositories
webhookContainer.load(WEBHOOK_DI_TOKENS.WEBHOOK_REPOSITORY, webhookRepositoryModule);

// Load services
webhookContainer.load(WEBHOOK_DI_TOKENS.WEBHOOK_SERVICE, webhookServicesModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.BOOKING_WEBHOOK_SERVICE, webhookServicesModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.FORM_WEBHOOK_SERVICE, webhookServicesModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.RECORDING_WEBHOOK_SERVICE, webhookServicesModule);

// Load payload builders
webhookContainer.load(WEBHOOK_DI_TOKENS.BOOKING_PAYLOAD_BUILDER, webhookFactoryModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.FORM_PAYLOAD_BUILDER, webhookFactoryModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.OOO_PAYLOAD_BUILDER, webhookFactoryModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.RECORDING_PAYLOAD_BUILDER, webhookFactoryModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.MEETING_PAYLOAD_BUILDER, webhookFactoryModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.INSTANT_MEETING_BUILDER, webhookFactoryModule);

// Load notifiers
webhookContainer.load(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFICATION_HANDLER, webhookFactoryModule);
webhookContainer.load(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER, webhookFactoryModule);

export function getBookingWebhookService() {
  return webhookContainer.get(WEBHOOK_DI_TOKENS.BOOKING_WEBHOOK_SERVICE);
}

export function getFormWebhookService() {
  return webhookContainer.get(WEBHOOK_DI_TOKENS.FORM_WEBHOOK_SERVICE);
}

export function getRecordingWebhookService() {
  return webhookContainer.get(WEBHOOK_DI_TOKENS.RECORDING_WEBHOOK_SERVICE);
}

export function getWebhookNotifier() {
  return webhookContainer.get(WEBHOOK_DI_TOKENS.WEBHOOK_NOTIFIER);
}
