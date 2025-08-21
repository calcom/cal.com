import type { TFunction } from "i18next";

import type { WorkflowActions } from "@calcom/prisma/enums";
import { WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

import {
  isSMSOrWhatsappAction,
  isWhatsappAction,
  isEmailToAttendeeAction,
  isCalAIAction,
} from "./actionHelperFunctions";
import {
  WHATSAPP_WORKFLOW_TEMPLATES,
  WORKFLOW_ACTIONS,
  BASIC_WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
  ATTENDEE_WORKFLOW_TEMPLATES,
} from "./constants";

/**
 * Build workflow action options for UI components.
 *
 * Returns an array of option objects for every Workflow action with a translated, capitalized label,
 * the action value, and a `needsCredits` flag indicating whether the action requires credits.
 *
 * The `needsCredits` flag is true when the action is an SMS or WhatsApp action and the caller is not
 * on an orgs plan, or when the action is a Cal AI action.
 *
 * @param isOrgsPlan - When true, org-level plan discounts/exemptions apply (affects `needsCredits`)
 * @returns Array of objects with shape `{ label: string, value: WorkflowActions, needsCredits: boolean }`
 */
export function getWorkflowActionOptions(t: TFunction, isOrgsPlan?: boolean) {
  return WORKFLOW_ACTIONS.map((action) => {
    const actionString = t(`${action.toLowerCase()}_action`);

    return {
      label: actionString.charAt(0).toUpperCase() + actionString.slice(1),
      value: action,
      needsCredits: (!isOrgsPlan && isSMSOrWhatsappAction(action)) || isCalAIAction(action),
    };
  });
}

export function getWorkflowTriggerOptions(t: TFunction) {
  // TODO: remove this after workflows are supported
  const filterdWorkflowTriggerEvents = WORKFLOW_TRIGGER_EVENTS.filter(
    (event) =>
      event !== WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW &&
      event !== WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  );

  return filterdWorkflowTriggerEvents.map((triggerEvent) => {
    const triggerString = t(`${triggerEvent.toLowerCase()}_trigger`);

    return { label: triggerString.charAt(0).toUpperCase() + triggerString.slice(1), value: triggerEvent };
  });
}

export function getWorkflowTemplateOptions(
  t: TFunction,
  action: WorkflowActions | undefined,
  hasPaidPlan: boolean
) {
  const TEMPLATES =
    action && isWhatsappAction(action)
      ? WHATSAPP_WORKFLOW_TEMPLATES
      : action && isEmailToAttendeeAction(action)
      ? ATTENDEE_WORKFLOW_TEMPLATES
      : BASIC_WORKFLOW_TEMPLATES;
  return TEMPLATES.map((template) => {
    return {
      label: t(`${template.toLowerCase()}`),
      value: template,
      needsTeamsUpgrade: !hasPaidPlan && template == WorkflowTemplates.CUSTOM,
    };
  }) as { label: string; value: any; needsTeamsUpgrade: boolean }[];
}
