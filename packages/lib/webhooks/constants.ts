import { WebhookTriggerEvents } from "@prisma/client";

// this is exported as we can't use `WebhookTriggerEvents` in the frontend straight-off

export const WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP = {
  core: [
    WebhookTriggerEvents.BOOKING_CANCELLED,
    WebhookTriggerEvents.BOOKING_CREATED,
    WebhookTriggerEvents.BOOKING_RESCHEDULED,
  ] as ["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED"],
  routing_forms: [WebhookTriggerEvents.FORM_SUBMITTED] as ["FORM_SUBMITTED"],
};

export const WEBHOOK_TRIGGER_EVENTS = [
  ...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP.core,
  ...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP.routing_forms,
] as ["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED", "FORM_SUBMITTED"];
