import { WebhookTriggerEvents } from "@calcom/lib/CalComClient/event";

export function mapZapierActionToWebhookEvent(action: string): WebhookTriggerEvents | null {
  const actionMap: Record<string, WebhookTriggerEvents> = {
    "booking_created": WebhookTriggerEvents.BOOKING_CREATED,
    "booking_rescheduled": WebhookTriggerEvents.BOOKING_RESCHEDULED,
    "booking_cancelled": WebhookTriggerEvents.BOOKING_CANCELLED,
    "booking_confirmed": WebhookTriggerEvents.BOOKING_CONFIRMED,
    "booking_declined": WebhookTriggerEvents.BOOKING_DECLINED,
    "booking_requested": WebhookTriggerEvents.BOOKING_REQUESTED,
    "booking_payment_initiated": WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
    "booking_no_show": WebhookTriggerEvents.BOOKING_NO_SHOW,
  };

  return actionMap[action] ?? null;
}