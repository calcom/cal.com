import type { TaskHandler, TaskTypes } from "../tasker";
/**
 * This is a map of all the tasks that the Tasker can handle.
 * The keys are the TaskTypes and the values are the task handlers.
 * The task handlers are imported dynamically to avoid circular dependencies.
 */
declare const tasks: Record<TaskTypes, () => Promise<TaskHandler>>;
export default tasks;
//# sourceMappingURL=index.d.ts.map