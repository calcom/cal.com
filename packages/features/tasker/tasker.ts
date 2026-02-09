import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import type { BookingAuditTaskConsumerPayload } from "@calcom/features/booking-audit/lib/types/bookingAuditTask";
import type { z } from "zod";

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
  triggerFormSubmittedNoEventWebhook: z.infer<
    typeof import("./tasks/triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWebhook").ZTriggerFormSubmittedNoEventWebhookPayloadSchema
  >;
  triggerFormSubmittedNoEventWorkflow: z.infer<
    typeof import("./tasks/triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWorkflow").ZTriggerFormSubmittedNoEventWorkflowPayloadSchema
  >;
  translateEventTypeData: z.infer<
    typeof import("./tasks/translateEventTypeData").ZTranslateEventDataPayloadSchema
  >;
  createCRMEvent: z.infer<typeof import("./tasks/crm/schema").createCRMEventSchema>;
  sendWorkflowEmails: z.infer<typeof import("./tasks/sendWorkflowEmails").ZSendWorkflowEmailsSchema>;
  scanWorkflowBody: z.infer<typeof import("./tasks/scanWorkflowBody").scanWorkflowBodySchema>;
  scanWorkflowUrls: z.infer<typeof import("./tasks/scanWorkflowUrls").scanWorkflowUrlsSchema>;
  sendAnalyticsEvent: z.infer<typeof import("./tasks/analytics/schema").sendAnalyticsEventSchema>;
  executeAIPhoneCall: {
    workflowReminderId: number;
    agentId: string;
    fromNumber: string;
    toNumber: string;
    bookingUid: string | null;
    userId: number | null;
    teamId: number | null;
    providerAgentId: string;
    responses?: FORM_SUBMITTED_WEBHOOK_RESPONSES | null;
    routedEventTypeId?: number | null;
  };
  bookingAudit: BookingAuditTaskConsumerPayload;
  sendAwaitingPaymentEmail: z.infer<
    typeof import("./tasks/sendAwaitingPaymentEmail").sendAwaitingPaymentEmailPayloadSchema
  >;
  sendProrationInvoiceEmail: z.infer<
    typeof import("./tasks/sendProrationInvoiceEmail").sendProrationInvoiceEmailPayloadSchema
  >;
  sendProrationReminderEmail: z.infer<
    typeof import("./tasks/sendProrationReminderEmail").sendProrationReminderEmailPayloadSchema
  >;
  cancelProrationReminder: z.infer<
    typeof import("./tasks/cancelProrationReminder").cancelProrationReminderPayloadSchema
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
