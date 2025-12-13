import type { WorkflowMethods } from "@calcom/prisma/enums";

export interface WorkflowReminderScheduledMessageDto {
  referenceId: string | null;
  workflowStep: {
    action: string;
  } | null;
  scheduledDate: Date;
  uuid: string | null;
  id: number;
  booking: {
    attendees: {
      email: string;
      locale: string | null;
    }[];
    user: {
      email: string;
    } | null;
  } | null;
}

export interface WorkflowReminderCreateInput {
  bookingUid: string;
  workflowStepId: number;
  method: WorkflowMethods;
  scheduledDate: Date;
  scheduled: boolean;
  seatReferenceUid?: string;
}

export interface WorkflowReminderWithStepAndWorkflowDto {
  id: number;
  bookingUid: string | null;
  workflowStepId: number | null;
  method: string;
  scheduledDate: Date | null;
  scheduled: boolean | null;
  referenceId: string | null;
  uuid: string | null;
  cancelled: boolean | null;
  seatReferenceUid: string | null;
  workflowStep: {
    id: number;
    stepNumber: number;
    action: string;
    workflowId: number;
    sendTo: string | null;
    reminderBody: string | null;
    emailSubject: string | null;
    template: string;
    numberRequired: boolean | null;
    sender: string | null;
    numberVerificationPending: boolean;
    includeCalendarEvent: boolean;
    workflow: {
      id: number;
      name: string;
      userId: number | null;
      teamId: number | null;
      trigger: string;
      time: number | null;
      timeUnit: string | null;
      isActiveOnAll: boolean | null;
      position: number;
      type: string;
    };
  } | null;
}

export interface IWorkflowReminderRepository {
  findScheduledMessagesToCancel(params: {
    teamId?: number | null;
    userIdsWithNoCredits: number[];
  }): Promise<WorkflowReminderScheduledMessageDto[]>;

  updateRemindersToEmail(params: { reminderIds: number[] }): Promise<{ count: number }>;

  create(input: WorkflowReminderCreateInput): Promise<{ id: number }>;

  findByIdIncludeStepAndWorkflow(id: number): Promise<WorkflowReminderWithStepAndWorkflowDto | null>;
}
