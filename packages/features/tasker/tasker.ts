export type TaskerTypes = "internal" | "redis";
export type TaskTypes = "sendEmail" | "sendWebhook" | "sendSms";
export type TaskHandler = (payload: string) => Promise<void>;
export interface Tasker {
  /** Create a new task with the given type and payload. */
  create(type: TaskTypes, payload: string): Promise<string>;
  processQueue(): Promise<void>;
  cleanup(): Promise<void>;
}
