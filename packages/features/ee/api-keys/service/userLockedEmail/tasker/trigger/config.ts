import { queue, type schemaTask } from "@trigger.dev/sdk";

type UserLockedEmailTaskConfig = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const userLockedEmailQueue = queue({
  name: "user-locked-email",
  concurrencyLimit: 10,
});

export const userLockedEmailTaskConfig: UserLockedEmailTaskConfig = {
  queue: userLockedEmailQueue,
  machine: "small-1x",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
};
