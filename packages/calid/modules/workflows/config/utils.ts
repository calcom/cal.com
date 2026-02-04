import { capitalize } from "lodash";
import type { TFunction } from "next-i18next";

import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions, WorkflowTriggerEvents, WorkflowTemplates } from "@calcom/prisma/enums";

import type { CalIdWorkflowType } from "../config/types";
import { defaultTemplateComponentsMap } from "../providers/meta_default_templates";
import emailCancelledTemplate from "../templates/email/cancelled";
import emailRatingTemplate from "../templates/email/ratingTemplate";
import emailReminderTemplate from "../templates/email/reminder";
import emailRescheduledTemplate from "../templates/email/rescheduled";
import emailThankYouTemplate from "../templates/email/thankYouTemplate";
import {
  ATTENDEE_WORKFLOW_TEMPLATES,
  BASIC_WORKFLOW_TEMPLATES,
  SMS_WORKFLOW_TEMPLATES,
  DYNAMIC_TEXT_VARIABLES,
  FORMATTED_DYNAMIC_TEXT_VARIABLES,
  TIME_UNITS,
  WHATSAPP_WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "./constants";

/**
 * Mapping of workflow templates to their default SMS message templates
 * Variables are replaced based on action type (attendee vs organizer/number)
 */
const WORKFLOW_TEMPLATE_TO_DEFAULT_MESSAGE: Record<WorkflowTemplates, string> = {
  [WorkflowTemplates.REMINDER]: `Hi {RECIPIENT_NAME} - Just a heads-up, your meeting "{EVENT_TYPE_NAME}" with {SENDER_NAME} is coming up on {EVENT_DATE} at {EVENT_TIME} {TIMEZONE}. See you then!

- Cal ID`,
  [WorkflowTemplates.CANCELLED]: `Hi {RECIPIENT_NAME} - Your meeting "{EVENT_TYPE_NAME}" with {SENDER_NAME} scheduled for {EVENT_DATE} at {EVENT_TIME} {TIMEZONE} has been cancelled.

- Cal ID`,
  [WorkflowTemplates.RESCHEDULED]: `Hi {RECIPIENT_NAME} - Your meeting "{EVENT_TYPE_NAME}" with {SENDER_NAME} has a new time: {EVENT_DATE} at {EVENT_TIME} {TIMEZONE}. See you then!

- Cal ID`,
  [WorkflowTemplates.COMPLETED]: `Hi {RECIPIENT_NAME} - Your meeting "{EVENT_TYPE_NAME}" with {SENDER_NAME} on {EVENT_DATE} at {EVENT_TIME} {TIMEZONE} is all wrapped up. Thanks for joining!

- Cal ID`,
  [WorkflowTemplates.CONFIRMATION]: `Hi {RECIPIENT_NAME} - You are all set! Your meeting "{EVENT_TYPE_NAME}" with {SENDER_NAME} is confirmed for {EVENT_DATE} at {EVENT_TIME} {TIMEZONE}. See you then!

- Cal ID`,
  // CUSTOM workflow uses user-provided messageTemplate, so no default needed
  [WorkflowTemplates.CUSTOM]: "",
  // RATING and THANKYOU currently have no default templates
  [WorkflowTemplates.RATING]: "",
  [WorkflowTemplates.THANKYOU]: "",
};

/**
 * Get the default SMS template body for a given template and action type
 * Replaces {RECIPIENT_NAME} with the appropriate recipient based on action type
 * Converts \n to <br> for HTML display in the editor
 */
function getSMSDefaultTemplateBody(template: WorkflowTemplates, action: WorkflowActions): string {
  const defaultTemplate = WORKFLOW_TEMPLATE_TO_DEFAULT_MESSAGE[template];

  if (!defaultTemplate) {
    return "";
  }

  // Determine recipient name variable based on action type
  const recipientNameVariable =
    action === WorkflowActions.SMS_ATTENDEE ? "{ATTENDEE_NAME}" : "{ORGANIZER_NAME}";

  const senderNameVariable = action === WorkflowActions.SMS_ATTENDEE ? "{ORGANIZER_NAME}" : "{ATTENDEE_NAME}";

  // Replace {RECIPIENT_NAME} with the appropriate variable and convert \n to <br>
  return defaultTemplate
    .replace(/{RECIPIENT_NAME}/g, recipientNameVariable)
    .replace(/{SENDER_NAME}/g, senderNameVariable)
    .replace(/\n/g, "<br>");
}

function validateSenderIdFormat(str: string): boolean {
  return str.length <= 11 && /^[A-Za-z0-9\s]*$/.test(str);
}

function isSMSAction(action: WorkflowActions): boolean {
  return action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.SMS_NUMBER;
}

function isWhatsappAction(action: WorkflowActions): boolean {
  return action === WorkflowActions.WHATSAPP_NUMBER || action === WorkflowActions.WHATSAPP_ATTENDEE;
}

function isEmailAction(action: WorkflowActions) {
  return (
    action === WorkflowActions.EMAIL_ADDRESS ||
    action === WorkflowActions.EMAIL_ATTENDEE ||
    action === WorkflowActions.EMAIL_HOST
  );
}

function isSMSOrWhatsappAction(action: WorkflowActions): boolean {
  return isSMSAction(action) || isWhatsappAction(action);
}

function isAttendeeAction(action: WorkflowActions): boolean {
  return (
    action === WorkflowActions.SMS_ATTENDEE ||
    action === WorkflowActions.EMAIL_ATTENDEE ||
    action === WorkflowActions.WHATSAPP_ATTENDEE
  );
}

const isEmailToAttendeeAction = (actionType: WorkflowActions): boolean => {
  return actionType === WorkflowActions.EMAIL_ATTENDEE;
};

function getTimeFormatFromUserSetting(timeFormat: number | null | undefined): TimeFormat {
  return timeFormat === 24 ? TimeFormat.TWENTY_FOUR_HOUR : TimeFormat.TWELVE_HOUR;
}

const determineWhatsappTemplateHandler = (templateCategory?: WorkflowTemplates): string => {
  return (
    defaultTemplateComponentsMap(templateCategory ?? WorkflowTemplates.REMINDER).components.find(
      (e) => e.type === "BODY"
    )?.text ?? "Body not found"
  );
};

function determineEmailTemplateHandler(template?: WorkflowTemplates) {
  switch (template) {
    case WorkflowTemplates.REMINDER:
      return emailReminderTemplate;
    case WorkflowTemplates.RATING:
      return emailRatingTemplate;
    case WorkflowTemplates.THANKYOU:
      return emailThankYouTemplate;
    case WorkflowTemplates.CANCELLED:
      return emailCancelledTemplate;
    case WorkflowTemplates.RESCHEDULED:
      return emailRescheduledTemplate;
    default:
      return emailReminderTemplate;
  }
}

// seems like this method is not used anywhere
function getWhatsappTemplateContent(
  actionType: WorkflowActions,
  localeString: string,
  templateType: WorkflowTemplates,
  timeFormatSetting: TimeFormat
): string | null {
  const contentRenderer = determineWhatsappTemplateHandler(templateType);
  return contentRenderer;
}

function translateTextVariables(text: string, language: { locale: string; t: TFunction }): string {
  let processedContent = text;

  if (language.locale !== "en") {
    const detectedVariables = text.match(/\{(.+?)}/g)?.map((variable) => {
      return variable.replace("{", "").replace("}", "");
    });

    detectedVariables?.forEach((variable) => {
      const substitutionPattern = new RegExp(`{${variable}}`, "g");
      let convertedVariable = DYNAMIC_TEXT_VARIABLES.includes(variable.toLowerCase())
        ? language.t(variable.toLowerCase().concat("_variable")).replace(/ /g, "_").toLocaleUpperCase()
        : DYNAMIC_TEXT_VARIABLES.includes(variable.toLowerCase().concat("_name"))
        ? language.t(variable.toLowerCase().concat("_name_variable")).replace(/ /g, "_").toLocaleUpperCase()
        : variable;

      const matchingFormattedVariable = FORMATTED_DYNAMIC_TEXT_VARIABLES.find((formattedVar) =>
        variable.toLowerCase().startsWith(formattedVar)
      );

      if (matchingFormattedVariable) {
        const baseVariableName = matchingFormattedVariable
          .substring(0, matchingFormattedVariable?.lastIndexOf("_"))
          .toLowerCase()
          .concat("_variable");

        convertedVariable = language
          .t(baseVariableName)
          .replace(/ /g, "_")
          .toLocaleUpperCase()
          .concat(matchingFormattedVariable?.substring(matchingFormattedVariable?.lastIndexOf("_")));
      }

      processedContent = processedContent.replace(substitutionPattern, `{${convertedVariable}}`);
    });
  }

  return processedContent;
}

function translateVariablesToEnglish(text: string, language: { locale: string; t: TFunction }): string {
  let modifiedText = text;

  if (language.locale !== "en") {
    const extractedVariables = text.match(/\{(.+?)}/g)?.map((variable) => {
      return variable.replace("{", "").replace("}", "");
    });

    extractedVariables?.forEach((variable) => {
      DYNAMIC_TEXT_VARIABLES.forEach((baseVar) => {
        const sanitizedVariableName = variable.replace("_NAME", "");
        const referenceVariable = `${baseVar}_variable`;
        if (
          language.t(referenceVariable).replace(/ /g, "_").toUpperCase() === variable ||
          language.t(referenceVariable).replace(/ /g, "_").toUpperCase() === sanitizedVariableName
        ) {
          modifiedText = modifiedText.replace(
            variable,
            language.t(referenceVariable, { lng: "en" }).replace(/ /g, "_").toUpperCase()
          );
          return;
        }
      });

      FORMATTED_DYNAMIC_TEXT_VARIABLES.forEach((formattedVar) => {
        const localizedVariable = language.t(`${formattedVar}variable`).replace(/ /g, "_").toUpperCase();
        if (variable.startsWith(localizedVariable)) {
          modifiedText = modifiedText.replace(localizedVariable, formattedVar.slice(0, -1).toUpperCase());
        }
      });
    });
  }

  return modifiedText;
}

function getTimeSectionText(trigger: WorkflowTriggerEvents, t: TFunction): string | null {
  const schedulingTextMapping: Partial<Record<WorkflowTriggerEvents, string>> = {
    [WorkflowTriggerEvents.AFTER_EVENT]: "how_long_after",
    [WorkflowTriggerEvents.BEFORE_EVENT]: "how_long_before",
    [WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW]: "how_long_after_hosts_no_show",
    [WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW]: "how_long_after_guests_no_show",
  };

  if (!schedulingTextMapping[trigger]) return null;
  return t(schedulingTextMapping[trigger]!);
}

function getWorkflowTriggerOptions(t: TFunction): Array<{
  label: string;
  value: WorkflowTriggerEvents;
}> {
  const availableTriggerEvents = WORKFLOW_TRIGGER_EVENTS.filter(
    (event) =>
      event !== WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW &&
      event !== WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  );

  return availableTriggerEvents.map((triggerEvent) => {
    const eventDescription = t(`${triggerEvent.toLowerCase()}_trigger`);
    return {
      label: eventDescription.charAt(0).toUpperCase() + eventDescription.slice(1),
      value: triggerEvent,
    };
  });
}

function getWorkflowTemplateOptions(
  t: TFunction,
  action: WorkflowActions | undefined
): Array<{
  label: string;
  value: WorkflowTemplates;
}> {
  const availableTemplates =
    action && isWhatsappAction(action)
      ? WHATSAPP_WORKFLOW_TEMPLATES
      : action && action === WorkflowActions.EMAIL_ATTENDEE
      ? ATTENDEE_WORKFLOW_TEMPLATES
      : isSMSAction(action)
      ? SMS_WORKFLOW_TEMPLATES
      : BASIC_WORKFLOW_TEMPLATES;

  // Helper to convert string to Title Case
  const toTitleCase = (str: string) =>
    str
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  return availableTemplates.map((template) => ({
    // label as titleCase
    label: t(`${toTitleCase(template)}`),
    value: template,
  }));
}

function getTimeUnitOptions(t: TFunction): Record<string, string> {
  return TIME_UNITS.reduce((accumulator, option) => {
    accumulator[option] = t(`${option.toLowerCase()}_timeUnit`);
    return accumulator;
  }, {} as Record<string, string>);
}

function getTemplateBodyForAction({
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
    return getSMSDefaultTemplateBody(template, action);
  }

  if (isWhatsappAction(action)) {
    const body = determineWhatsappTemplateHandler(template);
    return body;
  }

  // If not a whatsapp action then it's an email action
  const templateFunction = determineEmailTemplateHandler(template);
  return templateFunction({ isEditingMode: true, locale, action, timeFormat }).emailBody;
}

const compareReminderBodyToTemplate = ({
  reminderBody,
  template,
}: {
  reminderBody: string;
  template: string;
}) => {
  const stripHTML = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");

  const stripedReminderBody = stripHTML(reminderBody);
  const stripedTemplate = stripHTML(template);

  return stripedReminderBody === stripedTemplate;
};

export {
  WORKFLOW_TEMPLATE_TO_DEFAULT_MESSAGE,
  getSMSDefaultTemplateBody,
  determineEmailTemplateHandler,
  validateSenderIdFormat,
  isSMSAction,
  isWhatsappAction,
  isEmailAction,
  isSMSOrWhatsappAction,
  isAttendeeAction,
  isEmailToAttendeeAction,
  getTimeFormatFromUserSetting,
  getWhatsappTemplateContent,
  translateTextVariables,
  translateVariablesToEnglish,
  getTimeSectionText,
  getWorkflowTriggerOptions,
  getWorkflowTemplateOptions,
  getTimeUnitOptions,
  getTemplateBodyForAction,
  compareReminderBodyToTemplate,
};

/**
 * Generate trigger text for a workflow
 */
export const generateTriggerText = (workflow: CalIdWorkflowType, t: TFunction): string => {
  let triggerStr = t(`${workflow.trigger.toLowerCase()}_trigger`);
  if (workflow.timeUnit && workflow.time) {
    triggerStr = ` ${t(`${workflow.timeUnit.toLowerCase()}`, {
      count: workflow.time,
    })} ${triggerStr}`;
  }
  return capitalize(triggerStr);
};

/**
 * Generate event type info text for a workflow
 */
export const generateEventTypeInfo = (workflow: CalIdWorkflowType, t: TFunction): string => {
  if (workflow.isActiveOnAll) {
    // return workflow.isOrg  ? t("active_on_all_teams") : t("active_on_all_event_types");
    return t("active_on_all_event_types");
  } else if (workflow.activeOn && workflow.activeOn.length > 0) {
    const count = workflow.activeOn.filter((wf) =>
      workflow.calIdTeamId ? wf.eventType.parentId === null : true
    ).length;
    return t("active_on_event_types", { count });
  } else if (workflow.activeOnTeams && workflow.activeOnTeams.length > 0) {
    return t("active_on_teams", { count: workflow.activeOnTeams.length });
  } else {
    // return workflow.isOrg ? t("no_active_teams") : t("no_active_event_types");
    return t("no_active_event_types");
  }
};

/**
 * Generate action count text for a workflow
 */
export const generateActionText = (workflow: CalIdWorkflowType): string => {
  const actionCount = workflow.steps?.length || 0;
  return `${actionCount} ${actionCount <= 1 ? "Action" : "Actions"} added`;
};

/**
 * Generate workflow title with fallback logic
 */
export const generateWorkflowTitle = (workflow: CalIdWorkflowType, t: TFunction): string => {
  if (workflow.name) return workflow.name;

  if (workflow.steps[0]) {
    const actionName = t(`${workflow.steps[0].action.toLowerCase()}_action`);
    return `Untitled (${actionName.charAt(0).toUpperCase()}${actionName.slice(1)})`;
  }

  return "Untitled";
};

/**
 * Filter teams from profiles
 */
export const filterTeamsFromProfiles = (profiles: any[]): any[] => {
  return profiles.filter((profile) => !!profile.teamId);
};

export function shouldScheduleEmailReminder(action: WorkflowActions) {
  return action === WorkflowActions.EMAIL_ATTENDEE || action === WorkflowActions.EMAIL_HOST;
}

export function doesHaveSmsAttendeeWorkflow(workflows, trigger: WorkflowTriggerEvents) {
  if (!Array.isArray(workflows)) return false;

  return workflows.some(
    (workflow) =>
      workflow.trigger === trigger &&
      Array.isArray(workflow.steps) &&
      workflow.steps.some((step) => step.action === "SMS_ATTENDEE")
  );
}
