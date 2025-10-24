import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";

type WorkflowWithStepsAndTrigger = {
  trigger: WorkflowTriggerEvents;
  steps: {
    action: WorkflowActions;
  }[];
};

export function allowDisablingHostConfirmationEmails(workflows: WorkflowWithStepsAndTrigger[]) {
  return !!workflows.find(
    (workflow) =>
      workflow.trigger === WorkflowTriggerEvents.NEW_EVENT &&
      !!workflow.steps.find((step) => step.action === WorkflowActions.EMAIL_HOST)
  );
}

export function allowDisablingAttendeeConfirmationEmails(workflows: WorkflowWithStepsAndTrigger[]) {
  return !!workflows.find(
    (workflow) =>
      workflow.trigger === WorkflowTriggerEvents.NEW_EVENT &&
      !!workflow.steps.find(
        (step) =>
          step.action === WorkflowActions.EMAIL_ATTENDEE || step.action === WorkflowActions.SMS_ATTENDEE
      )
  );
}
