import { queue, type schemaTask } from "@trigger.dev/sdk";

type MonthlyProrationTaskConfig = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const monthlyProrationQueue = queue({
  name: "monthly-proration",
  concurrencyLimit: 5,
});

export const monthlyProrationTaskConfig: MonthlyProrationTaskConfig = {
  queue: monthlyProrationQueue,
  machine: "small-2x",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
};
