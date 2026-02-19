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

type PlanState = {
  hasPaidPlan?: boolean;
  hasActiveTeamPlan?: boolean;
  isTrial?: boolean;
};

export function getWorkflowTriggerOptions(t: TFunction, planState: PlanState = {}) {
  const { hasPaidPlan = false, hasActiveTeamPlan, isTrial } = planState;
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
    const needsTeamsUpgrade = !hasPaidPlan && isFormSubmittedTrigger;

    return {
      label: triggerString.charAt(0).toUpperCase() + triggerString.slice(1),
      value: triggerEvent,
      needsTeamsUpgrade,
      upgradeTeamsBadgeProps: needsTeamsUpgrade ? { hasPaidPlan, hasActiveTeamPlan, isTrial } : undefined,
    };
  });
}

function convertToTemplateOptions(
  t: TFunction,
  planState: PlanState,
  templates: readonly WorkflowTemplates[]
) {
  const { hasPaidPlan = false, hasActiveTeamPlan, isTrial } = planState;
  return templates.map((template) => {
    const needsTeamsUpgrade = !hasPaidPlan && template === WorkflowTemplates.CUSTOM;
    return {
      label: t(`${template.toLowerCase()}`),
      value: template,
      needsTeamsUpgrade,
      upgradeTeamsBadgeProps: needsTeamsUpgrade ? { hasPaidPlan, hasActiveTeamPlan, isTrial } : undefined,
    } as {
      label: string;
      value: WorkflowTemplates;
      needsTeamsUpgrade: boolean;
      upgradeTeamsBadgeProps?: PlanState;
    };
  });
}

export function getWorkflowTemplateOptions(
  t: TFunction,
  action: WorkflowActions | undefined,
  planState: PlanState,
  trigger: WorkflowTriggerEvents
) {
  if (isFormTrigger(trigger)) {
    return convertToTemplateOptions(t, planState, [WorkflowTemplates.CUSTOM]);
  }

  const TEMPLATES =
    action && isWhatsappAction(action)
      ? WHATSAPP_WORKFLOW_TEMPLATES
      : action && isEmailToAttendeeAction(action)
        ? ATTENDEE_WORKFLOW_TEMPLATES
        : BASIC_WORKFLOW_TEMPLATES;

  return convertToTemplateOptions(t, planState, TEMPLATES);
}
