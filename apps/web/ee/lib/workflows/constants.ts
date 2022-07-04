import { WorkflowTriggerEvents, WorkflowActions, TimeUnit, WorkflowTemplates } from "@prisma/client";

export const WORKFLOW_TRIGGER_EVENTS = [
  WorkflowTriggerEvents.BEFORE_EVENT,
  WorkflowTriggerEvents.EVENT_CANCELLED,
  WorkflowTriggerEvents.NEW_EVENT,
] as ["BEFORE_EVENT", "EVENT_CANCELLED", "NEW_EVENT"];

export const WORKFLOW_ACTIONS = [
  WorkflowActions.EMAIL_HOST,
  WorkflowActions.EMAIL_ATTENDEE,
  WorkflowActions.SMS_ATTENDEE,
  WorkflowActions.SMS_NUMBER,
] as ["EMAIL_HOST", "EMAIL_ATTENDEE", "SMS_ATTENDEE", "SMS_NUMBER"];

export const TIME_UNIT = [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE] as ["DAY", "HOUR", "MINUTE"];

export const WORKFLOW_TEMPLATES = [WorkflowTemplates.CUSTOM, WorkflowTemplates.REMINDER] as [
  "CUSTOM",
  "REMINDER"
];
