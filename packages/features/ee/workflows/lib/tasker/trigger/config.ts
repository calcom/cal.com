import type { schemaTask } from "@trigger.dev/sdk";
import { queue } from "@trigger.dev/sdk";

type WorkflowTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const workflowTasksQueue = queue({
  name: "workflow-tasks",
  concurrencyLimit: 20,
});

export const workflowTaskConfig: WorkflowTask = {
  queue: workflowTasksQueue,
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
