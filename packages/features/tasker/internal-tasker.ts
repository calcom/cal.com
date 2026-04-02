import logger from "@calcom/lib/logger";
import { Task } from "./repository";
import type { Tasker, TaskerCreate, TaskTypes } from "./tasker";

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

  async cleanup(): Promise<void> {
    const count = await Task.cleanup();
    logger.info(`Cleaned up ${count} tasks`);
  }

  async cancel(id: string): Promise<string> {
    const task = await Task.cancel(id);
    return task.id;
  }

  async cancelWithReference(referenceUid: string, type: TaskTypes): Promise<string | null> {
    const task = await Task.cancelWithReference(referenceUid, type);
    return task?.id ?? null;
  }
}
