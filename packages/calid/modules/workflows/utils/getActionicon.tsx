import { isSMSOrWhatsappAction } from "@calid/features/modules/workflows/config/utils";
import { Icon } from "@calid/features/ui/components/icon";

import classNames from "@calcom/ui/classNames";

import type { CalIdWorkflowStep } from "../config/types";

const DEFAULT_STYLE_CLASSES = "mr-1.5 inline h-3 w-3";

const COMMUNICATION_TYPES = {
  MOBILE: "MOBILE",
  EMAIL: "EMAIL",
  MIXED: "MIXED",
} as const;

type CommunicationType = (typeof COMMUNICATION_TYPES)[keyof typeof COMMUNICATION_TYPES];

function determineStepCommunicationType(stepAction: CalIdWorkflowStep["action"]): CommunicationType {
  return isSMSOrWhatsappAction(stepAction) ? COMMUNICATION_TYPES.MOBILE : COMMUNICATION_TYPES.EMAIL;
}

function analyzeCommunicationPattern(CalIdWorkflowSteps: CalIdWorkflowStep[]): CommunicationType {
  if (CalIdWorkflowSteps.length === 0) return COMMUNICATION_TYPES.EMAIL;

  const firstStepType = determineStepCommunicationType(CalIdWorkflowSteps[0].action);

  const hasMultipleTypes = CalIdWorkflowSteps.some((currentStep) => {
    const currentStepType = determineStepCommunicationType(currentStep.action);
    return currentStepType !== firstStepType;
  });

  return hasMultipleTypes ? COMMUNICATION_TYPES.MIXED : firstStepType;
}

function createIconElement(
  iconName: React.ComponentProps<typeof Icon>["name"],
  stylingClass?: string
): JSX.Element {
  const appliedStyles = stylingClass || DEFAULT_STYLE_CLASSES;

  return <Icon name={iconName} className={classNames(appliedStyles)} aria-hidden="true" />;
}

export function getActionIcon(steps: CalIdWorkflowStep[], className?: string): JSX.Element {
  const stepCount = steps.length;

  if (stepCount === 0) {
    return createIconElement("zap", className);
  }

  if (stepCount === 1) {
    const singleStepType = determineStepCommunicationType(steps[0].action);
    const iconIdentifier = singleStepType === COMMUNICATION_TYPES.MOBILE ? "smartphone" : "mail";
    return createIconElement(iconIdentifier, className);
  }

  const communicationCategory = analyzeCommunicationPattern(steps);

  const iconMapping = {
    [COMMUNICATION_TYPES.MOBILE]: "smartphone",
    [COMMUNICATION_TYPES.EMAIL]: "mail",
    [COMMUNICATION_TYPES.MIXED]: "bell",
  };

  const selectedIcon = iconMapping[communicationCategory] || "zap";
  return createIconElement(selectedIcon as React.ComponentProps<typeof Icon>["name"], className);
}
