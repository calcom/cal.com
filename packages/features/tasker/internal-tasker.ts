import { Task } from "./repository";
import { type Tasker, type TaskTypes } from "./tasker";
import tasksMap from "./tasks";

/**
 * This is the default internal Tasker that uses the Task repository to create tasks.
 * It doens't have any external dependencies and is suitable for most use cases.
 * To use a different Tasker, you can create a new class that implements the Tasker interface.
 * Then, you can use the TaskerFactory to select the new Tasker.
 */
export class InternalTasker implements Tasker {
  async create(type: TaskTypes, payload: string): Promise<string> {
    return Task.create(type, payload);
  }
  async processQueue(): Promise<void> {
    const tasks = await Task.getNextBatch();
    const tasksPromises = tasks.map(async (task) => {
      const taskHandlerGetter = tasksMap[task.type as keyof typeof tasksMap];
      if (!taskHandlerGetter) throw new Error(`Task handler not found for type ${task.type}`);
      const taskHandler = await taskHandlerGetter();
      return taskHandler(task.payload)
        .then(async () => {
          await Task.succeed(task.id);
        })
        .catch(async (error) => {
          await Task.retry(task.id, error instanceof Error ? error.message : "Unknown error");
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
}
