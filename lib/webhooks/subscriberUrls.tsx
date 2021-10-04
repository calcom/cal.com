import { Webhook, WebhookTriggerEvents } from "@prisma/client";

import prisma from "@lib/prisma";

const getSubscriberUrls = async (userId: number, triggerEvent: WebhookTriggerEvents): Promise<string[]> => {
  const allWebhooks = await prisma.webhook.findMany({
    where: {
      userId: userId,
    },
  });

  const filteredWebhooks = allWebhooks.filter((webhook: Webhook) => {
    return webhook.eventTriggers.includes(triggerEvent) && webhook.active;
  });

  const subscriberUrls = filteredWebhooks.map((webhook: Webhook) => {
    return webhook.subscriberUrl;
  });

  return subscriberUrls;
};

export default getSubscriberUrls;
