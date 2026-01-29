import type { ExtendedCalendarEvent } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import type { Workflow } from "@calcom/ee/workflows/lib/types";
import type { CreditCheckFn } from "@calcom/features/ee/billing/credit-service";

export type WorkflowTaskPayload = {
  bookingId: number;
  smsReminderNumber: string | null;
  hideBranding: boolean;
  seatReferenceUid?: string;
};

export interface IWorkflowTasker {
  scheduleRescheduleWorkflows(payload: WorkflowTaskPayload): Promise<{ runId: string }>;
}

export type WorkflowSyncSendPayload = {
  workflows: Workflow[];
  smsReminderNumber: string | null;
  calendarEvent: ExtendedCalendarEvent;
  hideBranding: boolean;
  seatReferenceUid?: string;
  isDryRun?: boolean;
  creditCheckFn: CreditCheckFn;
};

export type WorkflowAsyncTasksPayload = WorkflowTaskPayload;

type WithVoidReturns<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => unknown ? (...args: P) => void : T[K];
};

export type WorkflowTasks = WithVoidReturns<IWorkflowTasker>;
