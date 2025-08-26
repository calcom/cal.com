export const WEBHOOK_DI_TOKENS = {
  // Core interfaces
  WEBHOOK_SERVICE: Symbol("IWebhookService"),
  BOOKING_WEBHOOK_SERVICE: Symbol("IBookingWebhookService"),
  WEBHOOK_NOTIFIER: Symbol("IWebhookNotifier"),
  TASKER: Symbol("ITasker"),
  OOO_WEBHOOK_SERVICE: Symbol("OOO_WEBHOOK_SERVICE"),
  WEBHOOK_NOTIFICATION_HANDLER: Symbol("WebhookNotificationHandler"),

  // Optional: for repositories if you want to inject them later
  WEBHOOK_REPOSITORY: Symbol("IWebhookRepository"),

  // Factories
  WEBHOOK_PAYLOAD_FACTORY: Symbol("WebhookPayloadFactory"),
};
