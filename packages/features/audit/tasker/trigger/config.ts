import { queue } from "@trigger.dev/sdk";

export const auditEventQueue = queue({
  name: "audit-event",
  concurrencyLimit: 10,
});

export const auditEventTaskConfig = {
  machine: "small-1x" as const,
  queue: auditEventQueue,
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    randomize: true,
    outOfMemory: {
      machine: "small-2x" as const,
    },
  },
};
