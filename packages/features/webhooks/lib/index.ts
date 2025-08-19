// New Architecture Exports (Recommended)
export * from "./dto";
export * from "./factory";
export * from "./notifier";
export * from "./repository";
export * from "./service";
export * from "./delivery";
export * from "./services/BaseWebhookService";
export * from "./services/BookingWebhookService";
export * from "./services/RecordingWebhookService";
export * from "./services/OOOWebhookService";
export * from "./services/FormWebhookService";

// Legacy Exports (For Backward Compatibility)
export { default as getWebhooks } from "./getWebhooks";
export type { GetSubscriberOptions, GetWebhooksReturnType } from "./getWebhooks";
export { default as sendPayload } from "./sendPayload";
export { default as sendOrSchedulePayload } from "./sendOrSchedulePayload";
export * from "./sendPayload";
export { WebhookService as LegacyWebhookService } from "./WebhookService";

// Migration Utilities
export { handleWebhookTrigger } from "../bookings/lib/handleWebhookTrigger"; // Legacy
