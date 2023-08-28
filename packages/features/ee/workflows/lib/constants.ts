import { WorkflowTriggerEvents, TimeUnit, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

export const WORKFLOW_TRIGGER_EVENTS = [
  WorkflowTriggerEvents.BEFORE_EVENT,
  WorkflowTriggerEvents.EVENT_CANCELLED,
  WorkflowTriggerEvents.NEW_EVENT,
  WorkflowTriggerEvents.AFTER_EVENT,
  WorkflowTriggerEvents.RESCHEDULE_EVENT,
] as const;

export const WORKFLOW_ACTIONS = [
  WorkflowActions.EMAIL_HOST,
  WorkflowActions.EMAIL_ATTENDEE,
  WorkflowActions.EMAIL_ADDRESS,
  WorkflowActions.SMS_ATTENDEE,
  WorkflowActions.SMS_NUMBER,
  WorkflowActions.WHATSAPP_ATTENDEE,
  WorkflowActions.WHATSAPP_NUMBER,
] as const;

export const TIME_UNIT = [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE] as const;

export const WORKFLOW_TEMPLATES = [
  WorkflowTemplates.CUSTOM,
  WorkflowTemplates.REMINDER,
  WorkflowTemplates.CANCELLED,
  WorkflowTemplates.COMPLETED,
  WorkflowTemplates.RESCHEDULED,
] as const;

export const BASIC_WORKFLOW_TEMPLATES = [WorkflowTemplates.CUSTOM, WorkflowTemplates.REMINDER] as const;

export const WHATSAPP_WORKFLOW_TEMPLATES = [
  WorkflowTemplates.REMINDER,
  WorkflowTemplates.COMPLETED,
  WorkflowTemplates.CANCELLED,
  WorkflowTemplates.RESCHEDULED,
] as const;

export const DYNAMIC_TEXT_VARIABLES = [
  "event_name",
  "event_date",
  "event_time",
  "event_end_time",
  "timezone",
  "location",
  "organizer_name",
  "attendee_name",
  "attendee_first_name",
  "attendee_last_name",
  "attendee_email",
  "additional_notes",
  "meeting_url",
  "cancel_url",
  "reschedule_url",
];

export const FORMATTED_DYNAMIC_TEXT_VARIABLES = ["event_date_", "event_time_", "event_end_time_"];
