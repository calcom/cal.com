import type { WorkflowTriggerEvents } from "@prisma/client";
import type { TFunction } from "i18next";

import type { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

import {
  whatsappEventCancelledTemplate,
  whatsappEventCompletedTemplate,
  whatsappEventRescheduledTemplate,
  whatsappReminderTemplate,
} from "../lib/reminders/templates/whatsapp";
import emailRatingTemplate from "./reminders/templates/emailRatingTemplate";
import emailReminderTemplate from "./reminders/templates/emailReminderTemplate";
import smsReminderTemplate from "./reminders/templates/smsReminderTemplate";

export function shouldScheduleEmailReminder(action: WorkflowActions) {
  return action === WorkflowActions.EMAIL_ATTENDEE || action === WorkflowActions.EMAIL_HOST;
}

export function shouldScheduleSMSReminder(action: WorkflowActions) {
  return action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.SMS_NUMBER;
}

export function isSMSAction(action: WorkflowActions) {
  return action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.SMS_NUMBER;
}

export function isWhatsappAction(action: WorkflowActions) {
  return action === WorkflowActions.WHATSAPP_NUMBER || action === WorkflowActions.WHATSAPP_ATTENDEE;
}

export function isSMSOrWhatsappAction(action: WorkflowActions) {
  return isSMSAction(action) || isWhatsappAction(action);
}

export function isEmailAction(action: WorkflowActions) {
  return (
    action === WorkflowActions.EMAIL_ADDRESS ||
    action === WorkflowActions.EMAIL_ATTENDEE ||
    action === WorkflowActions.EMAIL_HOST
  );
}

export function isAttendeeAction(action: WorkflowActions) {
  return (
    action === WorkflowActions.SMS_ATTENDEE ||
    action === WorkflowActions.EMAIL_ATTENDEE ||
    action === WorkflowActions.WHATSAPP_ATTENDEE
  );
}

export function isEmailToAttendeeAction(action: WorkflowActions) {
  return action === WorkflowActions.EMAIL_ATTENDEE;
}

export function isTextMessageToSpecificNumber(action?: WorkflowActions) {
  return action === WorkflowActions.SMS_NUMBER || action === WorkflowActions.WHATSAPP_NUMBER;
}

export function getWhatsappTemplateForTrigger(trigger: WorkflowTriggerEvents): WorkflowTemplates {
  switch (trigger) {
    case "NEW_EVENT":
    case "BEFORE_EVENT":
      return WorkflowTemplates.REMINDER;
    case "AFTER_EVENT":
      return WorkflowTemplates.COMPLETED;
    case "EVENT_CANCELLED":
      return WorkflowTemplates.CANCELLED;
    case "RESCHEDULE_EVENT":
      return WorkflowTemplates.RESCHEDULED;
    default:
      return WorkflowTemplates.REMINDER;
  }
}

export function getWhatsappTemplateFunction(template?: WorkflowTemplates): typeof whatsappReminderTemplate {
  switch (template) {
    case "CANCELLED":
      return whatsappEventCancelledTemplate;
    case "COMPLETED":
      return whatsappEventCompletedTemplate;
    case "RESCHEDULED":
      return whatsappEventRescheduledTemplate;
    case "CUSTOM":
    case "REMINDER":
      return whatsappReminderTemplate;
    default:
      return whatsappReminderTemplate;
  }
}

function getEmailTemplateFunction(template?: WorkflowTemplates) {
  switch (template) {
    case WorkflowTemplates.REMINDER:
      return emailReminderTemplate;
    case WorkflowTemplates.RATING:
      return emailRatingTemplate;
    default:
      return emailReminderTemplate;
  }
}

export function getWhatsappTemplateForAction(
  action: WorkflowActions,
  locale: string,
  template: WorkflowTemplates,
  timeFormat: TimeFormat
): string | null {
  const templateFunction = getWhatsappTemplateFunction(template);
  return templateFunction(true, locale, action, timeFormat);
}

export function getTemplateBodyForAction({
  action,
  locale,
  t,
  template,
  timeFormat,
}: {
  action: WorkflowActions;
  locale: string;
  t: TFunction;
  template: WorkflowTemplates;
  timeFormat: TimeFormat;
}): string | null {
  if (isSMSAction(action)) {
    return smsReminderTemplate(true, locale, action, timeFormat);
  }

  if (isWhatsappAction(action)) {
    const templateFunction = getWhatsappTemplateFunction(template);
    return templateFunction(true, locale, action, timeFormat);
  }

  // If not a whatsapp action then it's an email action
  const templateFunction = getEmailTemplateFunction(template);
  return templateFunction({ isEditingMode: true, locale, t, action, timeFormat }).emailBody;
}
