import { Task } from "./repository";
import { type TaskerCreate, type Tasker } from "./tasker";
import tasksMap from "./tasks";

/**
 * This is the default internal Tasker that uses the Task repository to create tasks.
 * It doens't have any external dependencies and is suitable for most use cases.
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
      console.info(`Processing task ${task.id}`, task);
      const taskHandlerGetter = tasksMap[task.type as keyof typeof tasksMap];
      if (!taskHandlerGetter) throw new Error(`Task handler not found for type ${task.type}`);

      const taskHandler = await taskHandlerGetter();
      return taskHandler(task.payload)
        .then(async () => {
          await Task.succeed(task.id);
        })
        .catch(async (error) => {
          console.info(`Error processing task ${task.id}: ${error}`);
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
