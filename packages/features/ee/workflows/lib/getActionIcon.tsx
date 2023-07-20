import type { WorkflowStep } from "@prisma/client";

import { isSMSOrWhatsappAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { classNames } from "@calcom/lib";
import { WorkflowActions } from "@calcom/prisma/enums";
import { Zap, Smartphone, Mail, Bell } from "@calcom/ui/components/icon";

export function getActionIcon(steps: WorkflowStep[], className?: string): JSX.Element {
  if (steps.length === 0) {
    return <Zap className={classNames(className ? className : "mr-1.5 inline h-3 w-3")} aria-hidden="true" />;
  }

  if (steps.length === 1) {
    if (isSMSOrWhatsappAction(steps[0].action)) {
      return (
        <Smartphone
          className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
          aria-hidden="true"
        />
      );
    } else {
      return (
        <Mail className={classNames(className ? className : "mr-1.5 inline h-3 w-3")} aria-hidden="true" />
      );
    }
  }

  if (steps.length > 1) {
    let messageType = "";

    for (const step of steps) {
      if (!messageType) {
        messageType = isSMSOrWhatsappAction(step.action) ? "SMS" : "EMAIL";
      } else if (messageType !== "MIX") {
        const newMessageType = isSMSOrWhatsappAction(step.action) ? "SMS" : "EMAIL";
        if (newMessageType !== messageType) {
          messageType = "MIX";
        }
      } else {
        break;
      }
    }
    switch (messageType) {
      case "SMS":
        return (
          <Smartphone
            className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
            aria-hidden="true"
          />
        );
      case "EMAIL":
        return (
          <Mail className={classNames(className ? className : "mr-1.5 inline h-3 w-3")} aria-hidden="true" />
        );
      case "MIX":
        return (
          <Bell className={classNames(className ? className : "mr-1.5 inline h-3 w-3")} aria-hidden="true" />
        );
      default:
        <Zap className={classNames(className ? className : "mr-1.5 inline h-3 w-3")} aria-hidden="true" />;
    }
  }

  return <></>;
}
