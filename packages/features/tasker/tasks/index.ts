import type { TaskHandler, TaskTypes } from "../tasker";

/**
 * This is a map of all the tasks that the Tasker can handle.
 * The keys are the TaskTypes and the values are the task handlers.
 * The task handlers are imported dynamically to avoid circular dependencies.
 */
const tasks: Record<TaskTypes, () => Promise<TaskHandler>> = {
  sendEmail: () => import("./sendEmail").then((module) => module.sendEmail),
  sendWebhook: () => import("./sendWebook").then((module) => module.sendWebhook),
  sendSms: () => Promise.resolve(() => Promise.reject(new Error("Not implemented"))),
};

export default tasks;
