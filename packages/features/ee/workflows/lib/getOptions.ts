import type { TFunction } from "next-i18next";

import { WorkflowActions } from "@calcom/prisma/enums";

import {
  isTextMessageToAttendeeAction,
  isSMSOrWhatsappAction,
  isWhatsappAction,
} from "./actionHelperFunctions";
import {
  TIME_UNIT,
  WHATSAPP_WORKFLOW_TEMPLATES,
  WORKFLOW_ACTIONS,
  BASIC_WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "./constants";

export function getWorkflowActionOptions(t: TFunction, isTeamsPlan?: boolean, isOrgsPlan?: boolean) {
  return WORKFLOW_ACTIONS.filter((action) => action !== WorkflowActions.EMAIL_ADDRESS) //removing EMAIL_ADDRESS for now due to abuse episode
    .map((action) => {
      const actionString = t(`${action.toLowerCase()}_action`);

      return {
        label: actionString.charAt(0).toUpperCase() + actionString.slice(1),
        value: action,
        needsTeamsUpgrade:
          isSMSOrWhatsappAction(action) && !isTextMessageToAttendeeAction(action) && !isTeamsPlan,
        needsOrgsUpgrade: isTextMessageToAttendeeAction(action) && !isOrgsPlan,
      };
    });
}

export function getWorkflowTriggerOptions(t: TFunction) {
  return WORKFLOW_TRIGGER_EVENTS.map((triggerEvent) => {
    const triggerString = t(`${triggerEvent.toLowerCase()}_trigger`);

    return { label: triggerString.charAt(0).toUpperCase() + triggerString.slice(1), value: triggerEvent };
  });
}

export function getWorkflowTimeUnitOptions(t: TFunction) {
  return TIME_UNIT.map((timeUnit) => {
    return { label: t(`${timeUnit.toLowerCase()}_timeUnit`), value: timeUnit };
  });
}

export function getWorkflowTemplateOptions(t: TFunction, action: WorkflowActions | undefined) {
  const TEMPLATES =
    action && isWhatsappAction(action) ? WHATSAPP_WORKFLOW_TEMPLATES : BASIC_WORKFLOW_TEMPLATES;
  return TEMPLATES.map((template) => {
    return { label: t(`${template.toLowerCase()}`), value: template };
  }) as { label: string; value: any }[];
}
