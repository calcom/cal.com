import { WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@prisma/client";
import { whatsappEventCancelledTemplate, whatsappEventCompletedTemplate, whatsappEventRescheduledTemplate, whatsappReminderTemplate } from "../lib/reminders/templates/whatsapp";

export function isSMSAction(action: WorkflowActions) {
  return action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.SMS_NUMBER;
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

export function getWhatsappTemplateForTrigger(trigger: WorkflowTriggerEvents): WorkflowTemplates {
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

export function getWhatsappTemplateFunction(template: WorkflowTemplates): typeof whatsappReminderTemplate {
  switch(template) {
    case "CANCELLED":
      return whatsappEventCancelledTemplate
    case "COMPLETED":
      return whatsappEventCompletedTemplate
    case "RESCHEDULED":
      return whatsappEventRescheduledTemplate
    case "CUSTOM":
    case "REMINDER":
      return whatsappReminderTemplate
    default:
      return whatsappReminderTemplate
  }
}

export function getWhatsappTemplateForAction(action: WorkflowActions, template: WorkflowTemplates): string | null {
  const templateFunction = getWhatsappTemplateFunction(template)
  return templateFunction(true, action)
}
