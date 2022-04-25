import { WebhookTriggerEvents } from "@prisma/client";
import { SubscriptionType } from "@prisma/client";

import prisma from "@lib/prisma";

export type GetSubscriberOptions = {
  userId: number;
  eventTypeId: number;
  triggerEvent: WebhookTriggerEvents;
  subscriptionType: SubscriptionType;
};

const getSubscribers = async (options: GetSubscriberOptions) => {
  const { userId, eventTypeId, subscriptionType } = options;
  const allWebhooks = await prisma.webhook.findMany({
    where: {
      OR: [
        {
          userId,
        },
        {
          eventTypeId,
        },
      ],
      AND: {
        eventTriggers: {
          has: options.triggerEvent,
        },
        active: {
          equals: true,
        },
        subscriptionType: subscriptionType,
      },
    },
    select: {
      subscriberUrl: true,
      payloadTemplate: true,
      subscriptionType: true,
    },
  });

  return allWebhooks;
};

export default getSubscribers;
