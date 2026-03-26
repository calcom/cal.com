import { type schemaTask, queue } from "@trigger.dev/sdk";

type CalendarsTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const calendarsQueue = queue({
  name: "calendars",
  concurrencyLimit: 10,
});

export const calendarsTaskConfig: CalendarsTask = {
  machine: "small-2x",
  queue: calendarsQueue,
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
