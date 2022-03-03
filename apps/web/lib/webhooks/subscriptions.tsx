import { WebhookTriggerEvents } from "@prisma/client";

import prisma from "@lib/prisma";

export type GetSubscriberOptions = {
  userId: number;
  eventTypeId: number;
  triggerEvent: WebhookTriggerEvents;
};

const getSubscribers = async (options: GetSubscriberOptions) => {
  const { userId, eventTypeId } = options;
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
      },
    },
    select: {
      subscriberUrl: true,
      payloadTemplate: true,
    },
  });

  return allWebhooks;
};

export default getSubscribers;
