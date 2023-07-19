import { WebhookTriggerEvents } from "@calcom/prisma/enums";

// this is exported as we can't use `WebhookTriggerEvents` in the frontend straight-off

export const WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP = {
  core: [
    WebhookTriggerEvents.BOOKING_CANCELLED,
    WebhookTriggerEvents.BOOKING_CREATED,
    WebhookTriggerEvents.BOOKING_RESCHEDULED,
    WebhookTriggerEvents.BOOKING_PAID,
    WebhookTriggerEvents.MEETING_ENDED,
    WebhookTriggerEvents.BOOKING_REQUESTED,
    WebhookTriggerEvents.BOOKING_REJECTED,
    WebhookTriggerEvents.RECORDING_READY,
  ] as const,
  "routing-forms": [WebhookTriggerEvents.FORM_SUBMITTED] as const,
};

export const WEBHOOK_TRIGGER_EVENTS = [
  ...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP.core,
  ...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP["routing-forms"],
] as const;
