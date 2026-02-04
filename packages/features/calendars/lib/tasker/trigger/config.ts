import { type schemaTask, queue } from "@trigger.dev/sdk";

type CalendarsTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const calendarsQueue = queue({
  name: "calendars",
  concurrencyLimit: 10,
});

export const calendarsTaskConfig: CalendarsTask = {
  queue: calendarsQueue,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    randomize: true,
  },
};
