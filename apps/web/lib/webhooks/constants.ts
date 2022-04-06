import { WebhookTriggerEvents } from "@prisma/client";

// this is exported as we can't use `WebhookTriggerEvents` in the frontend straight-off
export const WEBHOOK_TRIGGER_EVENTS = [
  WebhookTriggerEvents.BOOKING_CANCELLED,
  WebhookTriggerEvents.BOOKING_CREATED,
  WebhookTriggerEvents.BOOKING_RESCHEDULED,
] as ["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED"];
