import { Task } from "./repository";
import tasksMap, { tasksConfig } from "./tasks";

/**
 * TaskProcessor handles the processing of tasks from the queue.
 * This is separated from task creation to avoid importing all task handlers
 * when only creating tasks, which eliminates compilation overhead.
 */
export class TaskProcessor {
  async processQueue(): Promise<void> {
    const tasks = await Task.getNextBatch();
    console.info(`Processing ${tasks.length} tasks`, tasks);

    const tasksPromises = tasks.map(async (task) => {
      console.info(
        `Processing task ${task.id}, attempt:${task.attempts} maxAttempts:${task.maxAttempts} lastFailedAttempt:${task.lastFailedAttemptAt}`,
        task
      );
      const taskHandlerGetter = tasksMap[task.type as keyof typeof tasksMap];
      if (!taskHandlerGetter) throw new Error(`Task handler not found for type ${task.type}`);
      const taskConfig = tasksConfig[task.type as keyof typeof tasksConfig];
      const taskHandler = await taskHandlerGetter();
      return taskHandler(task.payload, task.id)
        .then(async () => {
          await Task.succeed(task.id);
        })
        .catch(async (error) => {
          console.info(`Retrying task ${task.id}: ${error}`);
          await Task.retry({
            taskId: task.id,
            lastError: error instanceof Error ? error.message : "Unknown error",
            minRetryIntervalMins:
              taskConfig && "minRetryIntervalMins" in taskConfig ? taskConfig.minRetryIntervalMins : null,
          });
        });
    });
    const settled = await Promise.allSettled(tasksPromises);
    const failed = settled.filter((result) => result.status === "rejected");
    const succeded = settled.filter((result) => result.status === "fulfilled");
    console.info({ failed, succeded });
  }
}
