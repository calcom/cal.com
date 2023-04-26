import type { WorkflowTriggerEvents } from "@prisma/client";

export const workflowTriggerEvents: { [K in WorkflowTriggerEvents]: K } = {
  BEFORE_EVENT: "BEFORE_EVENT",
  EVENT_CANCELLED: "EVENT_CANCELLED",
  NEW_EVENT: "NEW_EVENT",
  AFTER_EVENT: "AFTER_EVENT",
  RESCHEDULE_EVENT: "RESCHEDULE_EVENT",
};

export default workflowTriggerEvents;
