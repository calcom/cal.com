export const WEBHOOK_TOKENS = {
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
} as const;
