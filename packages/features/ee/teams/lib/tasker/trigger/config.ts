import { queue, type schemaTask } from "@trigger.dev/sdk";

type TeamCleanupTaskConfig = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const teamCleanupQueue = queue({
  name: "team-cleanup",
  concurrencyLimit: 1,
});

export const teamCleanupTaskConfig: TeamCleanupTaskConfig = {
  queue: teamCleanupQueue,
  machine: "small-2x",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
};
