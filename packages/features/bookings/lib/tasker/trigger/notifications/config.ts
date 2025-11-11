import { type schemaTask } from "@trigger.dev/sdk/v3";

type BookingNotificationTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry">;

export const taskMachineAndRetryConfig: BookingNotificationTask = {
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
