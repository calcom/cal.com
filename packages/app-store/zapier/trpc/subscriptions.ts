import { WebhookTriggerEvents } from "@prisma/client";
import { zapierActions } from "../lib/actions";

const zapierActionToWebhookTrigger: { [key: string]: WebhookTriggerEvents } = {
  booking_created: WebhookTriggerEvents.BOOKING_CREATED,
  booking_cancelled: WebhookTriggerEvents.BOOKING_CANCELLED,
  booking_rescheduled: WebhookTriggerEvents.BOOKING_RESCHEDULED,
  meeting_ended: WebhookTriggerEvents.MEETING_ENDED,
  booking_no_show: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
};

export function mapActionToWebhookTrigger(actionId: string) {
  const action = zapierActions.find((a) => a.key === actionId);
  if (!action) {
    return null;
  }
  return zapierActionToWebhookTrigger[action.key] || null;
}
