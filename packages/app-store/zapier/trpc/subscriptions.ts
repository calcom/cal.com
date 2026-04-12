import { WebhookTriggerEvents } from "@calcom/prisma/enums";

export function mapZapierActionToWebhookEvent(action: string): WebhookTriggerEvents | null {
  const actionMap: Record<string, WebhookTriggerEvents> = {
    "booking_no_show": WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
  };

  return actionMap[action] ?? null;
}
