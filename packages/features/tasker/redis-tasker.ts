import type { Tasker, TaskTypes } from "./tasker";

/**
 * RedisTasker is a tasker that uses Redis as a backend.
 * WIP: This is a work in progress and is not fully implemented yet.
 **/
export class RedisTasker implements Tasker {
  async create(type: TaskTypes, payload: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  processQueue(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  cleanup(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
