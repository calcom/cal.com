/**
 * Workflow DTOs - Data Transfer Objects for workflow data
 */

/**
 * Workflow trigger events (ORM-agnostic string literal union)
 */
export type WorkflowTriggerEventsDto =
  | "BEFORE_EVENT"
  | "EVENT_CANCELLED"
  | "NEW_EVENT"
  | "AFTER_EVENT"
  | "RESCHEDULE_EVENT"
  | "AFTER_HOSTS_CAL_VIDEO_NO_SHOW"
  | "AFTER_GUESTS_CAL_VIDEO_NO_SHOW"
  | "FORM_SUBMITTED"
  | "FORM_SUBMITTED_NO_EVENT"
  | "BOOKING_REJECTED"
  | "BOOKING_REQUESTED"
  | "BOOKING_PAYMENT_INITIATED"
  | "BOOKING_PAID"
  | "BOOKING_NO_SHOW_UPDATED";

/**
 * Time unit values (ORM-agnostic string literal union)
 */
export type TimeUnitDto = "DAY" | "HOUR" | "MINUTE";

/**
 * Workflow actions (ORM-agnostic string literal union)
 */
export type WorkflowActionsDto =
  | "EMAIL_HOST"
  | "EMAIL_ATTENDEE"
  | "SMS_ATTENDEE"
  | "SMS_NUMBER"
  | "EMAIL_ADDRESS"
  | "WHATSAPP_ATTENDEE"
  | "WHATSAPP_NUMBER"
  | "CAL_AI_PHONE_CALL";

/**
 * Workflow templates (ORM-agnostic string literal union)
 */
export type WorkflowTemplatesDto =
  | "REMINDER"
  | "CUSTOM"
  | "CANCELLED"
  | "RESCHEDULED"
  | "COMPLETED"
  | "RATING";

/**
 * Workflow step information
 * Compatible with @calcom/features/ee/workflows/lib/types.WorkflowStep
 */
export interface WorkflowStepDto {
  id: number;
  stepNumber: number;
  action: WorkflowActionsDto;
  workflowId: number;
  sendTo: string | null;
  reminderBody: string | null;
  emailSubject: string | null;
  template: WorkflowTemplatesDto;
  numberRequired: boolean | null;
  sender: string | null;
  numberVerificationPending: boolean;
  includeCalendarEvent: boolean;
}

/**
 * Workflow information
 * Compatible with @calcom/features/ee/workflows/lib/types.Workflow
 */
export interface WorkflowDto {
  id: number;
  name: string;
  trigger: WorkflowTriggerEventsDto;
  time: number | null;
  timeUnit: TimeUnitDto | null;
  userId: number | null;
  teamId: number | null;
  steps: WorkflowStepDto[];
}

/**
 * Workflow on event type wrapper
 */
export interface WorkflowOnEventTypeDto {
  workflow: WorkflowDto;
}
