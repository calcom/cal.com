import type { TFunction } from "i18next";

import type { WorkflowActions } from "@calcom/prisma/enums";
import { WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

import {
  isSMSOrWhatsappAction,
  isWhatsappAction,
  isEmailToAttendeeAction,
  isCalAIAction,
  isFormTrigger,
} from "./actionHelperFunctions";
import {
  WHATSAPP_WORKFLOW_TEMPLATES,
  WORKFLOW_ACTIONS,
  BASIC_WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
  ATTENDEE_WORKFLOW_TEMPLATES,
} from "./constants";

export function getWorkflowActionOptions(t: TFunction, isOrgsPlan?: boolean) {
  return WORKFLOW_ACTIONS.map((action) => {
    const actionString = t(`${action.toLowerCase()}_action`);

    return {
      label: actionString.charAt(0).toUpperCase() + actionString.slice(1),
      value: action,
      needsCredits: (!isOrgsPlan && isSMSOrWhatsappAction(action)) || isCalAIAction(action),
      isCalAi: isCalAIAction(action),
    };
  });
}

export function getWorkflowTriggerOptions(t: TFunction, hasPaidPlan: boolean = false) {
  // TODO: remove this after workflows are supported
  const filterdWorkflowTriggerEvents = WORKFLOW_TRIGGER_EVENTS.filter(
    (event) =>
      event !== WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW &&
      event !== WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  );

  return filterdWorkflowTriggerEvents.map((triggerEvent) => {
    const triggerString = t(`${triggerEvent.toLowerCase()}_trigger`);
    const isFormSubmittedTrigger =
      triggerEvent === WorkflowTriggerEvents.FORM_SUBMITTED ||
      triggerEvent === WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT;

    return {
      label: triggerString.charAt(0).toUpperCase() + triggerString.slice(1),
      value: triggerEvent,
      needsTeamsUpgrade: !hasPaidPlan && isFormSubmittedTrigger,
    };
  });
}

function convertToTemplateOptions(
  t: TFunction,
  hasPaidPlan: boolean,
  templates: readonly WorkflowTemplates[]
) {
  return templates.map((template) => {
    return {
      label: t(`${template.toLowerCase()}`),
      value: template,
      needsTeamsUpgrade: !hasPaidPlan && template === WorkflowTemplates.CUSTOM,
    } as { label: string; value: any; needsTeamsUpgrade: boolean };
  });
}

export function getWorkflowTemplateOptions(
  t: TFunction,
  action: WorkflowActions | undefined,
  hasPaidPlan: boolean,
  trigger: WorkflowTriggerEvents
) {
  if (isFormTrigger(trigger)) {
    return convertToTemplateOptions(t, hasPaidPlan, [WorkflowTemplates.CUSTOM]);
  }

  const TEMPLATES =
    action && isWhatsappAction(action)
      ? WHATSAPP_WORKFLOW_TEMPLATES
      : action && isEmailToAttendeeAction(action)
      ? ATTENDEE_WORKFLOW_TEMPLATES
      : BASIC_WORKFLOW_TEMPLATES;

  return convertToTemplateOptions(t, hasPaidPlan, TEMPLATES);
}
