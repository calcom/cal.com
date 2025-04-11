import logger from "@calcom/lib/logger";

import { Task } from "./repository";
import { type TaskerCreate, type Tasker, TaskResultStatus } from "./tasker";
import tasksMap, { tasksConfig } from "./tasks";

const log = logger.getSubLogger({ prefix: ["internal-tasker"] });
/**
 * This is the default internal Tasker that uses the Task repository to create tasks.
 * It doesn't have any external dependencies and is suitable for most use cases.
 * To use a different Tasker, you can create a new class that implements the Tasker interface.
 * Then, you can use the TaskerFactory to select the new Tasker.
 */
export class InternalTasker implements Tasker {
  create: TaskerCreate = async (type, payload, options = {}): Promise<string> => {
    const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
    return Task.create(type, payloadString, options);
  };
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
      return taskHandler(task.payload)
        .then(async (result) => {
          // undefined is considered completed for all legacy tasks, that don't return anything. This is for backward compatibility.
          if (!result) {
            await Task.succeed(task.id);
            return;
          }

          if (result.status === TaskResultStatus.Completed) {
            await Task.succeed(task.id);
          } else if (result.status === TaskResultStatus.Progressing) {
            await Task.updateProgress({ taskId: task.id, payload: result.newPayload });
          } else if (result.status === TaskResultStatus.NoWorkToDo) {
            // Do nothing
            log.debug(`Task ${task.id} has no work to do`);
          }
        })
        .catch(async (error) => {
          console.info(`Retrying task ${task.id}: ${error}`);
          await Task.retry({
            taskId: task.id,
            lastError: error instanceof Error ? error.message : "Unknown error",
            minRetryIntervalMins: taskConfig?.minRetryIntervalMins ?? null,
          });
        });
    });
    const settled = await Promise.allSettled(tasksPromises);
    const failed = settled.filter((result) => result.status === "rejected");
    const succeded = settled.filter((result) => result.status === "fulfilled");
    console.info({ failed, succeded });
  }
  async cleanup(): Promise<void> {
    const count = await Task.cleanup();
    console.info(`Cleaned up ${count} tasks`);
  }
  async cancelWhere(query: { payloadContains: string }): Promise<number> {
    return await Task.cancelWhere(query);
  }
  async cancel(id: string): Promise<string> {
    const task = await Task.cancel(id);
    return task.id;
  }
}
