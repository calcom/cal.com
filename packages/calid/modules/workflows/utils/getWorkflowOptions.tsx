import type { TFunction } from "next-i18next";

import type { WorkflowActions } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";

import {
  WHATSAPP_WORKFLOW_TEMPLATES,
  WORKFLOW_ACTIONS,
  BASIC_WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
  ATTENDEE_WORKFLOW_TEMPLATES,
} from "../config/constants";
import { isSMSOrWhatsappAction, isWhatsappAction, isEmailToAttendeeAction } from "../config/utils";

const EXCLUDED_TRIGGER_EVENTS = [
  WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
];

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function createTranslatedOption(translator: TFunction, key: string, value: any) {
  const translatedText = translator(`${key.toLowerCase()}_action`);
  return {
    label: capitalizeFirstLetter(translatedText),
    value: value,
  };
}

function determineTemplateCollection(actionType?: WorkflowActions) {
  if (!actionType) return BASIC_WORKFLOW_TEMPLATES;

  if (isWhatsappAction(actionType)) {
    return WHATSAPP_WORKFLOW_TEMPLATES;
  }

  if (isEmailToAttendeeAction(actionType)) {
    return ATTENDEE_WORKFLOW_TEMPLATES;
  }

  return BASIC_WORKFLOW_TEMPLATES;
}

function shouldRequireTeamUpgrade(actionType: WorkflowActions, hasTeamsPlan?: boolean): boolean {
  return isSMSOrWhatsappAction(actionType) && !hasTeamsPlan;
}

export function getWorkflowActionOptions(t: TFunction, isTeamsPlan?: boolean, isOrgsPlan?: boolean) {
  return WORKFLOW_ACTIONS.map((actionType) => {
    const translatedActionName = t(`${actionType.toLowerCase()}_action`);
    const formattedLabel = capitalizeFirstLetter(translatedActionName);
    const requiresUpgrade = shouldRequireTeamUpgrade(actionType, isTeamsPlan);

    return {
      label: formattedLabel,
      value: actionType,
      needsTeamsUpgrade: requiresUpgrade,
    };
  });
}

export function getWorkflowTriggerOptions(t: TFunction) {
  const allowedTriggerEvents = WORKFLOW_TRIGGER_EVENTS.filter(
    (triggerEvent) =>
      !EXCLUDED_TRIGGER_EVENTS.includes(triggerEvent as (typeof EXCLUDED_TRIGGER_EVENTS)[number])
  );

  return allowedTriggerEvents.map((triggerEvent) => {
    const translatedTriggerName = t(`${triggerEvent.toLowerCase()}_trigger`);
    const capitalizedLabel = capitalizeFirstLetter(translatedTriggerName);

    return {
      label: capitalizedLabel,
      value: triggerEvent,
    };
  });
}

export function getWorkflowTemplateOptions(t: TFunction, action: WorkflowActions | undefined) {
  const selectedTemplateCollection = determineTemplateCollection(action);

  return selectedTemplateCollection.map((templateType) => {
    const translatedTemplate = t(`${templateType.toLowerCase()}`);
    return {
      label: translatedTemplate,
      value: templateType,
    };
  }) as { label: string; value: any }[];
}
