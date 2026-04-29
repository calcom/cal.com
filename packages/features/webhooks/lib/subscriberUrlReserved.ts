import type { WebhookForReservationCheck } from "./dto/types";

interface Params {
  subscriberUrl: string;
  id?: string;
  webhooks?: WebhookForReservationCheck[];
  userId?: number;
  eventTypeId?: number;
  platform?: boolean;
}

export const subscriberUrlReserved = ({
  subscriberUrl,
  id,
  webhooks,
  userId,
  eventTypeId,
  platform,
}: Params): boolean => {
  if (!userId && !eventTypeId && !platform) {
    throw new Error("Either userId, eventTypeId or platform must be provided.");
  }

  const findMatchingWebhook = (condition: (webhook: WebhookForReservationCheck) => boolean): boolean => {
    return !!webhooks?.find(
      (webhook) => webhook.subscriberUrl === subscriberUrl && (!id || webhook.id !== id) && condition(webhook)
    );
  };

  if (eventTypeId) {
    return findMatchingWebhook((webhook) => webhook.eventTypeId === eventTypeId);
  }
  if (platform) {
    return findMatchingWebhook((webhook) => webhook.platform === true);
  }
  return findMatchingWebhook((webhook) => webhook.userId === userId);
};
