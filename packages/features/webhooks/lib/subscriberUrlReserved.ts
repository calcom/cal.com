import type { Webhook } from "@calcom/prisma/client";

interface Params {
  subscriberUrl: string;
  id?: string;
  webhooks?: Webhook[];
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

  const findMatchingWebhook = (condition: (webhook: Webhook) => void) => {
    return !!webhooks?.find(
      (webhook) => webhook.subscriberUrl === subscriberUrl && (!id || webhook.id !== id) && condition(webhook)
    );
  };

  if (teamId) {
    return findMatchingWebhook((webhook: Webhook) => webhook.teamId === teamId);
  }
  if (eventTypeId) {
    return findMatchingWebhook((webhook: Webhook) => webhook.eventTypeId === eventTypeId);
  }
  if (platform) {
    return findMatchingWebhook((webhook: Webhook) => webhook.platform === true);
  }
  return findMatchingWebhook((webhook: Webhook) => webhook.userId === userId);
};
