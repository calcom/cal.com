export const WEBHOOK_TOKENS = {
  // Core interfaces
  WEBHOOK_SERVICE: Symbol("IWebhookService"),
  BOOKING_WEBHOOK_SERVICE: Symbol("IBookingWebhookService"),
  FORM_WEBHOOK_SERVICE: Symbol("IFormWebhookService"),
  RECORDING_WEBHOOK_SERVICE: Symbol("IRecordingWebhookService"),
  WEBHOOK_NOTIFIER: Symbol("IWebhookNotifier"),
  OOO_WEBHOOK_SERVICE: Symbol("OOO_WEBHOOK_SERVICE"),
  WEBHOOK_NOTIFICATION_HANDLER: Symbol("WebhookNotificationHandler"),

  // Payload builders
  BOOKING_PAYLOAD_BUILDER: Symbol("BookingPayloadBuilder"),
  FORM_PAYLOAD_BUILDER: Symbol("FormPayloadBuilder"),
  OOO_PAYLOAD_BUILDER: Symbol("OOOPayloadBuilder"),
  RECORDING_PAYLOAD_BUILDER: Symbol("RecordingPayloadBuilder"),
  MEETING_PAYLOAD_BUILDER: Symbol("MeetingPayloadBuilder"),
  INSTANT_MEETING_BUILDER: Symbol("InstantMeetingBuilder"),

  // Repositories
  WEBHOOK_REPOSITORY: Symbol("IWebhookRepository"),

  // Producer/Consumer (Phase 0)
  WEBHOOK_PRODUCER_SERVICE: Symbol("IWebhookProducerService"),
  WEBHOOK_PRODUCER_SERVICE_MODULE: Symbol("WebhookProducerService.module"),
  WEBHOOK_TASK_CONSUMER: Symbol("WebhookTaskConsumer"),
  WEBHOOK_TASK_CONSUMER_MODULE: Symbol("WebhookTaskConsumer.module"),
} as const;
