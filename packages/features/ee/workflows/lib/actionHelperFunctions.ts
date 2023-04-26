import type { WorkflowActions } from "@prisma/client";

import { WorkflowActions as workflowActionsEnum } from "@calcom/prisma/enums";

export function isSMSAction(action: WorkflowActions) {
  return action === workflowActionsEnum.SMS_ATTENDEE || action === workflowActionsEnum.SMS_NUMBER;
}

export function isAttendeeAction(action: WorkflowActions) {
  return action === workflowActionsEnum.SMS_ATTENDEE || action === workflowActionsEnum.EMAIL_ATTENDEE;
}
