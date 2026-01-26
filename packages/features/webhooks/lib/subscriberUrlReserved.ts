import type { WebhookForReservationCheck } from "./dto/types";

interface Params {
  subscriberUrl: string;
  id?: string;
  webhooks?: WebhookForReservationCheck[];
  teamId?: number;
  userId?: number;
  eventTypeId?: number;
  platform?: boolean;
}

export const subscriberUrlReserved = ({
  subscriberUrl,
  id,
  webhooks,
  teamId,
  userId,
  eventTypeId,
  platform,
}: Params): boolean => {
  if (!teamId && !userId && !eventTypeId && !platform) {
    throw new Error("Either teamId, userId, eventTypeId or platform must be provided.");
  }

  const findMatchingWebhook = (condition: (webhook: WebhookForReservationCheck) => boolean) => {
    return !!webhooks?.find(
      (webhook) => webhook.subscriberUrl === subscriberUrl && (!id || webhook.id !== id) && condition(webhook)
    );
  };

  if (teamId) {
    return findMatchingWebhook((webhook) => webhook.teamId === teamId);
  }
  if (eventTypeId) {
    return findMatchingWebhook((webhook) => webhook.eventTypeId === eventTypeId);
  }
  if (platform) {
    return findMatchingWebhook((webhook) => webhook.platform === true);
  }
  return findMatchingWebhook((webhook) => webhook.userId === userId);
};
