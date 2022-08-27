import { WorkflowActions, WorkflowStep } from "@prisma/client";

import { Icon } from "@calcom/ui/Icon";

export function getActionIcon(steps: WorkflowStep[]): JSX.Element {
  if (steps.length === 0) {
    return <Icon.FiZap className="mr-1.5 inline h-3 w-3" aria-hidden="true" />;
  }

  if (steps.length === 1) {
    if (steps[0].action === WorkflowActions.SMS_ATTENDEE || steps[0].action === WorkflowActions.SMS_NUMBER) {
      return <Icon.FiSmartphone className="mr-1.5 inline h-3 w-3" aria-hidden="true" />;
    } else {
      return <Icon.FiMail className="mr-1.5 inline h-3 w-3" aria-hidden="true" />;
    }
  }

  if (steps.length > 1) {
    let messageType = "";

    for (const step of steps) {
      if (!messageType) {
        messageType =
          step.action === WorkflowActions.SMS_ATTENDEE || step.action === WorkflowActions.SMS_NUMBER
            ? "SMS"
            : "EMAIL";
      } else if (messageType !== "MIX") {
        const newMessageType =
          step.action === WorkflowActions.SMS_ATTENDEE || step.action === WorkflowActions.SMS_NUMBER
            ? "SMS"
            : "EMAIL";
        if (newMessageType !== messageType) {
          messageType = "MIX";
        }
      } else {
        break;
      }
    }
    switch (messageType) {
      case "SMS":
        return <Icon.FiSmartphone className="mr-1.5 inline h-3 w-3" aria-hidden="true" />;
      case "EMAIL":
        return <Icon.FiMail className="mr-1.5 inline h-3 w-3" aria-hidden="true" />;
      case "MIX":
        return <Icon.FiBell className="mr-1.5 inline h-3 w-3" aria-hidden="true" />;
      default:
        <Icon.FiZap className="mr-1.5 inline h-3 w-3" aria-hidden="true" />;
    }
  }

  return <></>;
}
