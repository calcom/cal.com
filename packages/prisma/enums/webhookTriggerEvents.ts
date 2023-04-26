import type { WebhookTriggerEvents } from "@prisma/client";

export const webhookTriggerEvents: { [K in WebhookTriggerEvents]: K } = {
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_RESCHEDULED: "BOOKING_RESCHEDULED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  FORM_SUBMITTED: "FORM_SUBMITTED",
  MEETING_ENDED: "MEETING_ENDED",
};

export default webhookTriggerEvents;
