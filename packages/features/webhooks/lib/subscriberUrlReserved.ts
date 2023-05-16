import type { Webhook } from "@calcom/prisma/client";

interface Params {
  subscriberUrl: string;
  id?: string;
  webhooks?: Webhook[];
  teamId?: number;
  userId?: number;
  eventTypeId?: number;
}

export const subscriberUrlReserved = ({
  subscriberUrl,
  id,
  webhooks,
  teamId,
  userId,
  eventTypeId,
}: Params): boolean => {
  if (teamId) {
    return !!webhooks?.find(
      (webhook) =>
        webhook.subscriberUrl === subscriberUrl && (!id || webhook.id !== id) && webhook.teamId === teamId
    );
  }
  if (eventTypeId) {
    return !!webhooks?.find(
      (webhook) =>
        webhook.subscriberUrl === subscriberUrl &&
        (!id || webhook.id !== id) &&
        webhook.eventTypeId === eventTypeId
    );
  } else {
    return !!webhooks?.find(
      (webhook) =>
        webhook.subscriberUrl === subscriberUrl && (!id || webhook.id !== id) && webhook.userId === userId
    );
  }
};
