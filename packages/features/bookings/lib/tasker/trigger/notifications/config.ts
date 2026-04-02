import { queue, type schemaTask } from "@trigger.dev/sdk";

type BookingNotificationTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const bookingNotificationsQueue = queue({
  name: "booking-notifications",
  concurrencyLimit: 20,
});

export const bookingNotificationsTaskConfig: BookingNotificationTask = {
  queue: bookingNotificationsQueue,
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
