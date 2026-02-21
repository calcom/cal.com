import { type Queue, queue, type schemaTask } from "@trigger.dev/sdk";

type WebhookDeliveryTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const webhookDeliveryQueue: Queue = queue({
  name: "webhook-delivery",
  concurrencyLimit: 25,
});

export const webhookDeliveryTaskConfig: WebhookDeliveryTask = {
  machine: "small-1x",
  queue: webhookDeliveryQueue,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 30000,
    maxTimeoutInMs: 600000,
    randomize: true,
    outOfMemory: {
      machine: "medium-1x",
    },
  },
};
