import type { z } from "zod";

export type TaskerTypes = "internal" | "redis";
export const enum TaskResultStatus {
  Completed = "completed",
  Progressing = "progressing",
  NoWorkToDo = "noWorkToDo",
}

export type TaskResult =
  | {
      status: TaskResultStatus.Progressing;
      // Required payload update to record the progress
      newPayload: string;
    }
  | {
      // No work to do. Used by long running tasks when there is nothing to do at the moment by the task.
      status: TaskResultStatus.NoWorkToDo;
    }
  | {
      status: TaskResultStatus.Completed;
    }
  | void;

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
  createCRMEvent: z.infer<typeof import("./tasks/crm/schema").createCRMEventSchema>;
  delegationCredentialSelectedCalendars: z.infer<
    typeof import("./tasks/delegationCredentialSelectedCalendars").ZDelegationCredentialSelectedCalendarsPayloadSchema
  >;
  scanWorkflowBody: z.infer<typeof import("./tasks/scanWorkflowBody").scanWorkflowBodySchema>;
};
export type TaskTypes = keyof TaskPayloads;
export type TaskHandler = (payload: string) => Promise<TaskResult>;
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
  cancelWhere(query: { payloadContains: string }): Promise<number>;
}
