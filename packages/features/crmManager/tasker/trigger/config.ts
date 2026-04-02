import { queue, type schemaTask } from "@trigger.dev/sdk";

type CRMTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const crmQueue = queue({
  name: "crm",
  concurrencyLimit: 10,
});

export const crmTaskConfig: CRMTask = {
  machine: "small-2x",
  queue: crmQueue,
  retry: {
    maxAttempts: 10,
    factor: 2,
    minTimeoutInMs: 600000,
    maxTimeoutInMs: 3600000,
    randomize: true,
    outOfMemory: {
      machine: "medium-1x",
    },
  },
};
