import { queue, type schemaTask } from "@trigger.dev/sdk";

type CalendarSubscriptionTaskConfig = Pick<Parameters<typeof schemaTask>[0], "queue" | "retry">;

export const calendarSubscriptionQueue = queue({
  name: "calendar-subscription",
  concurrencyLimit: 1,
});

export const calendarSubscriptionTaskConfig: CalendarSubscriptionTaskConfig = {
  queue: calendarSubscriptionQueue,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 120_000,
    randomize: true,
  },
};
