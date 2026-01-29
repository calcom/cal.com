import { WEBHOOK_TASKER_DI_TOKENS } from "./tasker/tokens";

export const WEBHOOK_TOKENS = {
  ...WEBHOOK_TASKER_DI_TOKENS,
  // Core interfaces
  WEBHOOK_SERVICE: Symbol("IWebhookService"),
  BOOKING_WEBHOOK_SERVICE: Symbol("IBookingWebhookService"),
  FORM_WEBHOOK_SERVICE: Symbol("IFormWebhookService"),
  RECORDING_WEBHOOK_SERVICE: Symbol("IRecordingWebhookService"),
  WEBHOOK_NOTIFIER: Symbol("IWebhookNotifier"),
  OOO_WEBHOOK_SERVICE: Symbol("OOO_WEBHOOK_SERVICE"),
  WEBHOOK_NOTIFICATION_HANDLER: Symbol("WebhookNotificationHandler"),

  // Payload builder factory (versioning)
  PAYLOAD_BUILDER_FACTORY: Symbol("PayloadBuilderFactory"),

  // Repositories
  WEBHOOK_REPOSITORY: Symbol("IWebhookRepository"),
  WEBHOOK_EVENT_TYPE_REPOSITORY: Symbol("IEventTypeRepository"),
  WEBHOOK_USER_REPOSITORY: Symbol("IUserRepository"),

  // Producer/Consumer
  WEBHOOK_PRODUCER_SERVICE: Symbol("IWebhookProducerService"),
  WEBHOOK_PRODUCER_SERVICE_MODULE: Symbol("WebhookProducerService.module"),
  WEBHOOK_TASK_CONSUMER: Symbol("WebhookTaskConsumer"),
  WEBHOOK_TASK_CONSUMER_MODULE: Symbol("WebhookTaskConsumer.module"),

  // Data Fetchers (Strategy Pattern implementations for WebhookTaskConsumer)
  BOOKING_DATA_FETCHER: Symbol("BookingWebhookDataFetcher"),
  PAYMENT_DATA_FETCHER: Symbol("PaymentWebhookDataFetcher"),
  FORM_DATA_FETCHER: Symbol("FormWebhookDataFetcher"),
  RECORDING_DATA_FETCHER: Symbol("RecordingWebhookDataFetcher"),
  OOO_DATA_FETCHER: Symbol("OOOWebhookDataFetcher"),
} as const;
