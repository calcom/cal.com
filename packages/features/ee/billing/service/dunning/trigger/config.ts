import { queue, type schemaTask } from "@trigger.dev/sdk";

type DunningTaskConfig = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const dunningQueue = queue({
  name: "dunning",
  concurrencyLimit: 5,
});

export const dunningTaskConfig: DunningTaskConfig = {
  queue: dunningQueue,
  machine: "small-2x",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 60_000,
    maxTimeoutInMs: 300_000,
    randomize: true,
    outOfMemory: {
      machine: "medium-1x",
    },
  },
};
