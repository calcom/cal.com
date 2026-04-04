import { queue, type schemaTask } from "@trigger.dev/sdk";

type ProrationEmailTaskConfig = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const prorationEmailQueue = queue({
  name: "proration-email",
  concurrencyLimit: 10,
});

export const prorationEmailTaskConfig: ProrationEmailTaskConfig = {
  queue: prorationEmailQueue,
  machine: "small-1x",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
};
