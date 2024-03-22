import { TaskerFactory } from "tasker/tasker-factory";

import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { WebhookDataType } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";

export async function handleWebhookTrigger(args: {
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: string;
  webhookData: Omit<WebhookDataType, "createdAt" | "triggerEvent">;
}) {
  try {
    const subscribers = await getWebhooks(args.subscriberOptions);
    const taskerFactory = new TaskerFactory();
    const tasker = taskerFactory.createTasker();
    const promises = subscribers.map((sub) =>
      tasker.create(
        "sendWebhook",
        JSON.stringify({
          secretKey: sub.secret,
          triggerEvent: args.eventTrigger,
          createdAt: new Date().toISOString(),
          webhook: sub,
          data: args.webhookData,
        })
      )
    );
    await Promise.allSettled(promises);
  } catch (error) {
    logger.error("Error while scheduling webhooks", error);
  }
}
