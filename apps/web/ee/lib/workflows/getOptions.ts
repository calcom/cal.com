import { TFunction } from "next-i18next";

import {
  TIME_UNIT,
  WORKFLOW_ACTIONS,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "@ee/lib/workflows/constants";

export function getWorkflowActionOptions(t: TFunction) {
  return WORKFLOW_ACTIONS.map((action) => {
    return { label: t(`${action.toLowerCase()}_action`), value: action };
  });
}

export function getWorkflowTriggerOptions(t: TFunction) {
  return WORKFLOW_TRIGGER_EVENTS.map((triggerEvent) => {
    return { label: t(`${triggerEvent.toLowerCase()}_trigger`), value: triggerEvent };
  });
}

export function getWorkflowTimeUnitOptions(t: TFunction) {
  return TIME_UNIT.map((timeUnit) => {
    return { label: t(`${timeUnit.toLowerCase()}_timeUnit`), value: timeUnit };
  });
}

export function getWorkflowTemplateOptions(t: TFunction) {
  return WORKFLOW_TEMPLATES.map((template) => {
    return { label: t(`${template.toLowerCase()}`), value: template };
  });
}
