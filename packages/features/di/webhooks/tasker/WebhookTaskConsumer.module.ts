import type { ModuleLoader } from "@calcom/features/di/di";
import type { WebhookTaskConsumer } from "@calcom/features/webhooks/lib/service/WebhookTaskConsumer";
import type { Container } from "@evyweb/ioctopus";
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
import { webhookTaskConsumerModule } from "../modules/WebhookTaskConsumer.module";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

const token = WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER;

const loadModule = (container: Container) => {
  loggerModuleLoader.loadModule(container);
  prismaModuleLoader.loadModule(container);
  container.load(SHARED_TOKENS.TASKER, taskerServiceModule);

  container.load(WEBHOOK_TOKENS.WEBHOOK_EVENT_TYPE_REPOSITORY, webhookModule);
  container.load(WEBHOOK_TOKENS.WEBHOOK_USER_REPOSITORY, webhookModule);
  container.load(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY, webhookModule);
  container.load(WEBHOOK_TOKENS.WEBHOOK_SERVICE, webhookModule);
  container.load(WEBHOOK_TOKENS.BOOKING_WEBHOOK_SERVICE, webhookModule);
  container.load(WEBHOOK_TOKENS.FORM_WEBHOOK_SERVICE, webhookModule);
  container.load(WEBHOOK_TOKENS.RECORDING_WEBHOOK_SERVICE, webhookModule);
  container.load(WEBHOOK_TOKENS.OOO_WEBHOOK_SERVICE, webhookModule);
  container.load(WEBHOOK_TOKENS.PAYLOAD_BUILDER_FACTORY, webhookModule);
  container.load(WEBHOOK_TOKENS.WEBHOOK_NOTIFICATION_HANDLER, webhookModule);
  container.load(WEBHOOK_TOKENS.WEBHOOK_NOTIFIER, webhookModule);

  container.load(WEBHOOK_TOKENS.BOOKING_DATA_FETCHER, bookingWebhookDataFetcherModule);
  container.load(WEBHOOK_TOKENS.PAYMENT_DATA_FETCHER, paymentWebhookDataFetcherModule);
  container.load(WEBHOOK_TOKENS.FORM_DATA_FETCHER, formWebhookDataFetcherModule);
  container.load(WEBHOOK_TOKENS.RECORDING_DATA_FETCHER, recordingWebhookDataFetcherModule);
  container.load(WEBHOOK_TOKENS.OOO_DATA_FETCHER, oooWebhookDataFetcherModule);

  container.load(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER, webhookTaskConsumerModule);
};

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export type { WebhookTaskConsumer };
