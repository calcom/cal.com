import type { IWebhookDataFetcher } from "@calcom/features/webhooks/lib/interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import type { ILogger } from "@calcom/features/webhooks/lib/interface/infrastructure";
import { WebhookTaskConsumer } from "@calcom/features/webhooks/lib/service/WebhookTaskConsumer";
import type { Container } from "@evyweb/ioctopus";
import { createModule } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

/**
 * Consumer Module
 *
 * Binds the heavy WebhookTaskConsumer.
 * Dependencies: WebhookRepository, Data Fetchers array (Strategy Pattern), Logger
 *
 * Uses Strategy Pattern: Data fetchers are injected as an array,
 * consumer uses polymorphism to route to the correct fetcher.
 */
export const webhookTaskConsumerModule = createModule();

webhookTaskConsumerModule.bind(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER).toFactory((container: Container) => {
  const webhookRepository = container.get<IWebhookRepository>(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY);
  const dataFetchers: IWebhookDataFetcher[] = [
    container.get<IWebhookDataFetcher>(WEBHOOK_TOKENS.BOOKING_DATA_FETCHER),
    container.get<IWebhookDataFetcher>(WEBHOOK_TOKENS.PAYMENT_DATA_FETCHER),
    container.get<IWebhookDataFetcher>(WEBHOOK_TOKENS.FORM_DATA_FETCHER),
    container.get<IWebhookDataFetcher>(WEBHOOK_TOKENS.RECORDING_DATA_FETCHER),
    container.get<IWebhookDataFetcher>(WEBHOOK_TOKENS.OOO_DATA_FETCHER),
  ];
  const logger = container.get<ILogger>(SHARED_TOKENS.LOGGER);

  return new WebhookTaskConsumer(webhookRepository, dataFetchers, logger);
});
