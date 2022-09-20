import { WebhookTriggerEvents } from "@prisma/client";

import prisma from "@calcom/prisma";

export type GetSubscriberOptions = {
  userId: number;
  eventTypeId: number;
  triggerEvent: WebhookTriggerEvents;
};

const getWebhooks = async (options: GetSubscriberOptions) => {
  // const { userId, eventTypeId } = options;

  const allWebhooks = await prisma.webhook.findMany({
    where: {
      // We should only Allow Webhook on Mento Account, not per user
      // OR: [
      //   {
      //     userId,
      //   },
      //   {
      //     eventTypeId,
      //   },
      // ],
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
      id: true,
      subscriberUrl: true,
      payloadTemplate: true,
      appId: true,
      secret: true,
    },
  });

  return allWebhooks;
};

export default getWebhooks;
