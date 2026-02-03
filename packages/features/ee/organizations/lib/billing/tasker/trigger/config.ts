import type { Queue, schemaTask } from "@trigger.dev/sdk";
import { queue } from "@trigger.dev/sdk";

type PlatformBillingTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const platformBillingQueue: Queue = queue({
  name: "platform-billing",
  concurrencyLimit: 5,
});

export const platformBillingTaskConfig: PlatformBillingTask = {
  queue: platformBillingQueue,
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
