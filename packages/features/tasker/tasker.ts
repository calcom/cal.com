import type { z } from "zod";

export type TaskerTypes = "internal" | "redis";
type TaskPayloads = {
  sendEmail: string;
  sendWebhook: string;
  sendSms: string;
  triggerHostNoShowWebhook: z.infer<
    typeof import("./tasks/triggerNoShow/schema").ZSendNoShowWebhookPayloadSchema
  >;
  triggerGuestNoShowWebhook: z.infer<
    typeof import("./tasks/triggerNoShow/schema").ZSendNoShowWebhookPayloadSchema
  >;
  triggerFormSubmittedNoEventWebhook: z.infer<
    typeof import("./tasks/triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWebhook").ZTriggerFormSubmittedNoEventWebhookPayloadSchema
  >;
  translateEventTypeData: z.infer<
    typeof import("./tasks/translateEventTypeData").ZTranslateEventDataPayloadSchema
  >;
};
export type TaskTypes = keyof TaskPayloads;
export type TaskHandler = (payload: string) => Promise<void>;
export type TaskerCreate = <TaskKey extends keyof TaskPayloads>(
  type: TaskKey,
  payload: TaskPayloads[TaskKey],
  options?: { scheduledAt?: Date; maxAttempts?: number }
) => Promise<string>;
export interface Tasker {
  /** Create a new task with the given type and payload. */
  create: TaskerCreate;
  processQueue(): Promise<void>;
  cleanup(): Promise<void>;
}
