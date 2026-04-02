import type { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { TFunction } from "i18next";
import {
  whatsappEventCancelledTemplate,
  whatsappEventCompletedTemplate,
  whatsappEventRescheduledTemplate,
  whatsappReminderTemplate,
} from "../lib/reminders/templates/whatsapp";
import { FORM_TRIGGER_WORKFLOW_EVENTS } from "./constants";
import emailRatingTemplate from "./reminders/templates/emailRatingTemplate";
import emailReminderTemplate from "./reminders/templates/emailReminderTemplate";
import smsReminderTemplate from "./reminders/templates/smsReminderTemplate";
import type { WorkflowStep } from "./types";

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

export function isCalAIAction(action: WorkflowActions) {
  return action === WorkflowActions.CAL_AI_PHONE_CALL;
}

export function isEmailAction(
  action: WorkflowActions
): action is Extract<WorkflowActions, "EMAIL_HOST" | "EMAIL_ATTENDEE" | "EMAIL_ADDRESS"> {
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

export function getTemplateSubjectForAction({
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
  // SMS and WhatsApp don't have subjects
  if (isSMSAction(action) || isWhatsappAction(action)) {
    return null;
  }

  // For email actions, get the subject from the template
  const templateFunction = getEmailTemplateFunction(template);
  return templateFunction({ isEditingMode: true, locale, t, action, timeFormat }).emailSubject;
}

export function isFormTrigger(trigger: WorkflowTriggerEvents) {
  return FORM_TRIGGER_WORKFLOW_EVENTS.includes(trigger);
}

export function hasCalAIAction(steps: WorkflowStep[]) {
  return steps.some((step) => isCalAIAction(step.action));
}

export function getEventTypeIdForCalAiTest({
  trigger,
  outboundEventTypeId,
  eventTypeIds,
  activeOnEventTypeId,
  t,
}: {
  trigger: WorkflowTriggerEvents;
  outboundEventTypeId?: number | null;
  eventTypeIds?: number[];
  activeOnEventTypeId?: string;
  t: TFunction;
}): { eventTypeId: number | null; error: string | null } {
  if (isFormTrigger(trigger)) {
    if (trigger === WorkflowTriggerEvents.FORM_SUBMITTED) {
      if (!outboundEventTypeId) {
        return { eventTypeId: null, error: t("choose_event_type_in_agent_setup") };
      }
      return { eventTypeId: outboundEventTypeId, error: null };
    } else {
      // FORM_SUBMITTED_NO_EVENT
      if (!eventTypeIds || eventTypeIds.length === 0) {
        return { eventTypeId: null, error: t("no_event_types_available_for_test_call") };
      }
      return { eventTypeId: eventTypeIds[0], error: null };
    }
  } else {
    // For regular event type triggers, use the selected event type
    if (!activeOnEventTypeId) {
      return { eventTypeId: null, error: t("choose_at_least_one_event_type_test_call") };
    }
    const parsedEventTypeId = parseInt(activeOnEventTypeId, 10);
    if (isNaN(parsedEventTypeId)) {
      return { eventTypeId: null, error: t("choose_at_least_one_event_type_test_call") };
    }
    return { eventTypeId: parsedEventTypeId, error: null };
  }
}
