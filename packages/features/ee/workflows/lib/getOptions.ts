import type { WorkflowActions } from "@prisma/client";
import type { TFunction } from "next-i18next";

import {
  TimeUnit,
  WorkflowActions as workflowActionsEnum,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";

import { isSMSAction } from "./actionHelperFunctions";

// import { TIME_UNIT, WORKFLOW_ACTIONS, WORKFLOW_TEMPLATES, WORKFLOW_TRIGGER_EVENTS } from "./constants";

export function getWorkflowActionOptions(t: TFunction, isTeamsPlan?: boolean) {
  return Object.keys(workflowActionsEnum)
    .filter((action) => action !== workflowActionsEnum.EMAIL_ADDRESS) //removing EMAIL_ADDRESS for now due to abuse episode
    .map((action) => {
      const actionString = t(`${action.toLowerCase()}_action`);

      return {
        label: actionString.charAt(0).toUpperCase() + actionString.slice(1),
        value: action,
        needsUpgrade: isSMSAction(action as WorkflowActions) && !isTeamsPlan,
      };
    });
}

export function getWorkflowTriggerOptions(t: TFunction) {
  return Object.keys(WorkflowTriggerEvents).map((triggerEvent) => {
    const triggerString = t(`${triggerEvent.toLowerCase()}_trigger`);

    return { label: triggerString.charAt(0).toUpperCase() + triggerString.slice(1), value: triggerEvent };
  });
}

export function getWorkflowTimeUnitOptions(t: TFunction) {
  return Object.keys(TimeUnit).map((timeUnit) => {
    return { label: t(`${timeUnit.toLowerCase()}_timeUnit`), value: timeUnit };
  });
}

export function getWorkflowTemplateOptions(t: TFunction) {
  return Object.keys(WorkflowTemplates).map((template) => {
    return { label: t(`${template.toLowerCase()}`), value: template };
  });
}
