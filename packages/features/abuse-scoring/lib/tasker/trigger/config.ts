import { type schemaTask, queue } from "@trigger.dev/sdk";

type AbuseScoringTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const abuseScoringQueue = queue({
  name: "abuse-scoring",
  concurrencyLimit: 5,
});

export const abuseScoringTaskConfig: AbuseScoringTask = {
  machine: "small-2x",
  queue: abuseScoringQueue,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 60000,
    maxTimeoutInMs: 300000,
    randomize: true,
    outOfMemory: {
      machine: "medium-1x",
    },
  },
};
