import { WorkflowTriggerEvents } from "@calcom/prisma/client";
import { WorkflowActions } from "@calcom/prisma/enums";

import type { Workflow } from "./types";

export function allowDisablingHostConfirmationEmails(workflows: Workflow[]) {
  return !!workflows.find(
    (workflow) =>
      workflow.trigger === WorkflowTriggerEvents.NEW_EVENT &&
      !!workflow.steps.find((step) => step.action === WorkflowActions.EMAIL_HOST)
  );
}

export function allowDisablingAttendeeConfirmationEmails(workflows: Workflow[]) {
  return !!workflows.find(
    (workflow) =>
      workflow.trigger === WorkflowTriggerEvents.NEW_EVENT &&
      !!workflow.steps.find(
        (step) =>
          step.action === WorkflowActions.EMAIL_ATTENDEE || step.action === WorkflowActions.SMS_ATTENDEE
      )
  );
}
