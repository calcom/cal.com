import { WebhookTriggerEvents } from "@prisma/client";

import prisma from "@lib/prisma";

const getSubscriberUrls = async (userId: number, triggerEvent: WebhookTriggerEvents): Promise<string[]> => {
  const allWebhooks = await prisma.webhook.findMany({
    where: {
      userId: userId,
      AND: {
        eventTriggers: {
          has: triggerEvent,
        },
        active: {
          equals: true,
        },
      },
    },
    select: {
      subscriberUrl: true,
    },
  });
  const subscriberUrls = allWebhooks.map(({ subscriberUrl }) => subscriberUrl);

  return subscriberUrls;
};

export default getSubscriberUrls;
