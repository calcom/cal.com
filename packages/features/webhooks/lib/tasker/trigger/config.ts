import type { Queue, schemaTask } from "@trigger.dev/sdk";
import { queue } from "@trigger.dev/sdk";

type WebhookDeliveryTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

/**
 * Queue configuration for webhook delivery tasks
 *
 * Webhooks are time-sensitive, so we use a moderate concurrency limit
 * to ensure timely delivery while not overwhelming external services.
 */
export const webhookDeliveryQueue: Queue = queue({
  name: "webhook-delivery",
  concurrencyLimit: 20,
});

/**
 * Task configuration for webhook delivery
 *
 * - machine: small-2x for lightweight HTTP requests
 * - retry: 3 attempts with exponential backoff for transient failures
 */
export const webhookDeliveryTaskConfig: WebhookDeliveryTask = {
  queue: webhookDeliveryQueue,
  machine: "small-2x",
  retry: {
    maxAttempts: 3,
    factor: 1.8,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 30_000,
    randomize: true,
    outOfMemory: {
      machine: "medium-1x",
    },
  },
};
