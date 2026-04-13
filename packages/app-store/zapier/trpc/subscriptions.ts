import { WebhookTriggerEvents } from "@prisma/client";
import { zapierTriggers } from "../lib";
import type { TCreateSubscriptionSchema } from "./zapier.schema";

export const mapTriggerToWebhookEvent = (
  trigger: (typeof zapierTriggers)[keyof typeof zapierTriggers]
): WebhookTriggerEvents => {
  switch (trigger) {
    case zapierTriggers.BOOKING_CREATED:
      return WebhookTriggerEvents.BOOKING_CREATED;
    case zapierTriggers.BOOKING_RESCHEDULED:
      return WebhookTriggerEvents.BOOKING_RESCHEDULED;
    case zapierTriggers.BOOKING_CANCELLED:
      return WebhookTriggerEvents.BOOKING_CANCELLED;
    case zapierTriggers.BOOKING_NO_SHOW:
      return WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED;
    default:
      throw new Error(`Unsupported trigger: ${trigger}`);
  }
};

export const createSubscription = async (input: TCreateSubscriptionSchema) => {
  const { subscriberUrl, trigger, appId } = input;

  const webhook = await addSubscription({
    appId,
    subscriberUrl,
    trigger: mapTriggerToWebhookEvent(trigger),
    // ... rest of the implementation
  });

  return webhook;
};
