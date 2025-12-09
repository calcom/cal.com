import type { z } from "zod";

import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import type { BookingAuditTaskConsumerPayload } from "@calcom/features/booking-audit/lib/types/bookingAuditTask";
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
