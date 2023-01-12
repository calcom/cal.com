import { TimeUnit, WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@prisma/client";

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
] as const;

export const TIME_UNIT = [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE] as const;

export const WORKFLOW_TEMPLATES = [WorkflowTemplates.CUSTOM, WorkflowTemplates.REMINDER] as const;

export const DYNAMIC_TEXT_VARIABLES = [
  "event_name",
  "event_date",
  "event_time",
  "location",
  "organizer_name",
  "attendee_name",
  "attendee_email",
  "additional_notes",
  "meeting_url",
];
