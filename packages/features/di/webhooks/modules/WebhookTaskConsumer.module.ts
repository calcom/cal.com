import type { PayloadBuilderFactory } from "@calcom/features/webhooks/lib/factory/versioned/PayloadBuilderFactory";
import type { IWebhookDataFetcher } from "@calcom/features/webhooks/lib/interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import type { ILogger } from "@calcom/features/webhooks/lib/interface/infrastructure";
import type { IWebhookService } from "@calcom/features/webhooks/lib/interface/services";
import { WebhookTaskConsumer } from "@calcom/features/webhooks/lib/service/WebhookTaskConsumer";
import type { ResolveFunction } from "@evyweb/ioctopus";
import { createModule, type Module } from "@evyweb/ioctopus";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

/**
 * Consumer Module
 *
 * Binds the heavy WebhookTaskConsumer.
 * Dependencies: WebhookRepository, Data Fetchers (Strategy Pattern), PayloadBuilderFactory, WebhookService, Logger
 *
 * Uses Strategy Pattern for data fetching and proper DI for HTTP delivery via WebhookService.
 */
const webhookTaskConsumerModule: Module = createModule();

webhookTaskConsumerModule.bind(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER).toFactory((resolve: ResolveFunction) => {
  const webhookRepository = resolve(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY) as IWebhookRepository;
  const dataFetchers: IWebhookDataFetcher[] = [
    resolve(WEBHOOK_TOKENS.BOOKING_DATA_FETCHER) as IWebhookDataFetcher,
    resolve(WEBHOOK_TOKENS.PAYMENT_DATA_FETCHER) as IWebhookDataFetcher,
    resolve(WEBHOOK_TOKENS.FORM_DATA_FETCHER) as IWebhookDataFetcher,
    resolve(WEBHOOK_TOKENS.RECORDING_DATA_FETCHER) as IWebhookDataFetcher,
    resolve(WEBHOOK_TOKENS.OOO_DATA_FETCHER) as IWebhookDataFetcher,
  ];
  const payloadBuilderFactory: PayloadBuilderFactory = resolve(
    WEBHOOK_TOKENS.PAYLOAD_BUILDER_FACTORY
  ) as PayloadBuilderFactory;
  const webhookService: IWebhookService = resolve(WEBHOOK_TOKENS.WEBHOOK_SERVICE) as IWebhookService;
  const logger = resolve(SHARED_TOKENS.LOGGER) as ILogger;

  return new WebhookTaskConsumer(
    webhookRepository,
    dataFetchers,
    payloadBuilderFactory,
    webhookService,
    logger
  );
});
export { webhookTaskConsumerModule };
