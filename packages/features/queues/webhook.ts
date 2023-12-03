import type { QueueOptions } from "bull";
import Bull from "bull";

import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import type { WebhookDataType } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const AdvancedSettings = {
  lockDuration: 10000, // Key expiration time for job locks.
};

const redisClientConfig: QueueOptions = {
  redis: process.env.REDIS_URL,
  settings: AdvancedSettings,
};

const webhookTriggerOb = new Bull("WebhookTriggerQueue", redisClientConfig);

webhookTriggerOb.process(async function (job, done) {
  const jsonOb = JSON.parse(JSON.stringify(job.data));

  try {
    const subscriberOptions: GetSubscriberOptions = jsonOb.subscriberOptions;
    const eventTrigger: string = jsonOb.eventTrigger;
    const webhookData: Omit<WebhookDataType, "createdAt" | "triggerEvent"> = jsonOb.webhookData;

    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData });
    done();
  } catch (error) {
    logger.debug(
      "Error while Sending round robin scheduled emails",
      safeStringify({
        error: error,
      })
    );
    throw new Error("some unexpected error");
  }
});

export { webhookTriggerOb };
