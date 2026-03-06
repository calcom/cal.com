import { queue, type schemaTask } from "@trigger.dev/sdk";

type DunningEmailTaskConfig = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const dunningEmailQueue = queue({
  name: "dunning-email",
  concurrencyLimit: 10,
});

export const dunningEmailTaskConfig: DunningEmailTaskConfig = {
  queue: dunningEmailQueue,
  machine: "small-1x",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 60_000,
    maxTimeoutInMs: 300_000,
    randomize: true,
    outOfMemory: {
      machine: "small-2x",
    },
  },
};
