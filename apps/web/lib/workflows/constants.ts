import { WorkflowTriggerEvents } from "@prisma/client";
import { WorkflowActions } from "@prisma/client";

export const WORKFLOW_TRIGGER_EVENTS = [
  WorkflowTriggerEvents.BEFORE_EVENT,
  WorkflowTriggerEvents.EVENT_CANCELLED,
  WorkflowTriggerEvents.NEW_EVENT,
] as ["BEFORE_EVENT", "EVENT_CANCELLED", "NEW_EVENT"];

export const WORKFLOW_ACTIONS = [WorkflowActions.EMAIL_HOST, WorkflowActions.EMAIL_ATTENDEE] as [
  "EMAIL_HOST",
  "EMAIL_ATTENDEE"
];
