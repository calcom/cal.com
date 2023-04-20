import { WorkflowActions } from "@prisma/client";

export function isSMSAction(action: WorkflowActions) {
  return action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.SMS_NUMBER;
}

export function isAttendeeAction(action: WorkflowActions) {
  return action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.EMAIL_ATTENDEE;
}
