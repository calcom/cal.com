import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";

type WorkflowWithStepsAndTrigger = {
  trigger: WorkflowTriggerEvents;
  steps: {
    action: WorkflowActions;
  }[];
};

export function allowDisablingHostConfirmationEmails(_workflows: WorkflowWithStepsAndTrigger[]) {
  return true;
}


export function allowDisablingAttendeeConfirmationEmails(_workflows: WorkflowWithStepsAndTrigger[]) {
  return true;
}
