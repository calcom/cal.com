import { createContainer } from "@evyweb/ioctopus";

import { moduleLoader as loggerModuleLoader } from "../../shared/services/logger.service";
import { taskerServiceModule } from "../../shared/services/tasker.service";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";
import { webhookModule } from "../modules/Webhook.module";

export const webhookContainer = createContainer();

// Load shared infrastructure
loggerModuleLoader.loadModule(webhookContainer);
webhookContainer.load(SHARED_TOKENS.TASKER, taskerServiceModule);

// Load webhook module
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.OOO_WEBHOOK_SERVICE, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.PAYLOAD_BUILDER_FACTORY, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_NOTIFICATION_HANDLER, webhookModule);
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER, webhookModule);

// Service getters
export function getBookingWebhookService() {
  return webhookContainer.get(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE);
}

export function getFormWebhookService() {
  return webhookContainer.get(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE);
}

export function getRecordingWebhookService() {
  return webhookContainer.get(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE);
}

export function getWebhookNotifier() {
  return webhookContainer.get(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER);
}
