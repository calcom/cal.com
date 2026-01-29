import { type Tasker, type TaskTypes } from "./tasker";

/**
 * RedisTasker is a tasker that uses Redis as a backend.
 * WIP: This is a work in progress and is not fully implemented yet.
 **/
export class RedisTasker implements Tasker {
  create: TaskerCreate = async (type, payload) => {
    throw new Error("Method not implemented.");
  };

  async cancel(id: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async cancelWithReference(referenceUid: string, type: TaskTypes): Promise<string | null> {
    throw new Error("Method not implemented.");
  }

  processQueue(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  cleanup(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
