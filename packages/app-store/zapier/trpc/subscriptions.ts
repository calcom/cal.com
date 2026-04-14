import { WebhookTriggerEvents } from "@prisma/client";
import { zapierActions } from "../lib/actions";

const zapierActionToWebhookTrigger: { [key: string]: WebhookTriggerEvents } = {
  booking_created: WebhookTriggerEvents.BOOKING_CREATED,
  booking_rescheduled: WebhookTriggerEvents.BOOKING_RESCHEDULED,
  booking_cancelled: WebhookTriggerEvents.BOOKING_CANCELLED,
  meeting_ended: WebhookTriggerEvents.MEETING_ENDED,
  booking_no_show: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
};

export function mapActionToWebhookTrigger(actionId: string): WebhookTriggerEvents | undefined {
  return zapierActionToWebhookTrigger[actionId];
}

export function getWebhookTriggersForAction(actionId: string): WebhookTriggerEvents[] {
  const trigger = mapActionToWebhookTrigger(actionId);
  return trigger ? [trigger] : [];
}
