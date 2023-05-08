import { WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@prisma/client";

export function isSMSAction(action: WorkflowActions) {
  return action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.SMS_NUMBER
}

export function isWhatsappAction(action: WorkflowActions) {
  return action === WorkflowActions.WHATSAPP_NUMBER || action === WorkflowActions.WHATSAPP_ATTENDEE;
}

export function isSMSOrWhatsappAction(action: WorkflowActions) {
  return isSMSAction(action) || isWhatsappAction(action)
}

export function isAttendeeAction(action: WorkflowActions) {
  return action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.EMAIL_ATTENDEE || action === WorkflowActions.WHATSAPP_ATTENDEE;
}


export function getDefaultTemplateForWorkflowStep (action: WorkflowActions, trigger: WorkflowTriggerEvents): WorkflowTemplates {
  if (!isWhatsappAction(action)) {
    return WorkflowTemplates.REMINDER
  } else {
    switch(trigger) {
      case "NEW_EVENT":
      case "BEFORE_EVENT":
        return WorkflowTemplates.REMINDER
      case "AFTER_EVENT":
        return WorkflowTemplates.COMPLETED
      case "EVENT_CANCELLED":
        return WorkflowTemplates.CANCELLED
      case "RESCHEDULE_EVENT":
        return WorkflowTemplates.RESCHEDULED
      default:
        return WorkflowTemplates.REMINDER
    }
  }
}
