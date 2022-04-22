import { WebhookTriggerEvents } from "@prisma/client";

import prisma from "@lib/prisma";

export type GetSubscriberOptions = {
  userId: number;
  triggerEvent: WebhookTriggerEvents;
};

const getZapierSubscribers = async (options: GetSubscriberOptions) => {
  const { userId, triggerEvent } = options;
  const allSubscribers = await prisma.webhook.findMany({
    where: {
      AND: [
        {
          userId,
        },
        {
          isZapierSubscription: true,
        },
        {
          eventTriggers: {
            has: triggerEvent,
          },
        },
      ],
    },
    select: {
      subscriberUrl: true,
      payloadTemplate: true,
    },
  });

  return allSubscribers;
};

export default getZapierSubscribers;
