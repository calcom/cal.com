import type { z } from "zod";

type BookingAuditTaskConsumerPayload = string;

export type TaskerTypes = "internal" | "redis";
type TaskPayloads = {
  sendWebhook: string;
  sendSms: string;
  triggerHostNoShowWebhook: z.infer<
    typeof import("./tasks/triggerNoShow/schema").ZSendNoShowWebhookPayloadSchema
  >;
  triggerGuestNoShowWebhook: z.infer<
    typeof import("./tasks/triggerNoShow/schema").ZSendNoShowWebhookPayloadSchema
  >;
  translateEventTypeData: z.infer<
    typeof import("./tasks/translateEventTypeData").ZTranslateEventDataPayloadSchema
  >;
  createCRMEvent: z.infer<typeof import("./tasks/crm/schema").createCRMEventSchema>;
  sendAnalyticsEvent: z.infer<typeof import("./tasks/analytics/schema").sendAnalyticsEventSchema>;
  bookingAudit: BookingAuditTaskConsumerPayload;
  sendAwaitingPaymentEmail: z.infer<
    typeof import("./tasks/sendAwaitingPaymentEmail").sendAwaitingPaymentEmailPayloadSchema
  >;
  webhookDelivery: z.infer<
    typeof import("@calcom/features/webhooks/lib/types/webhookTask").webhookTaskPayloadSchema
  >;
};
export type TaskTypes = keyof TaskPayloads;
export type TaskHandler = (payload: string, taskId?: string) => Promise<void>;
export type TaskerCreate = <TaskKey extends keyof TaskPayloads>(
  type: TaskKey,
  payload: TaskPayloads[TaskKey],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
) => Promise<string>;
export interface Tasker {
  /** Create a new task with the given type and payload. */
  create: TaskerCreate;
  cleanup(): Promise<void>;
  cancel(id: string): Promise<string>;
  cancelWithReference(referenceUid: string, type: TaskTypes): Promise<string | null>;
}
