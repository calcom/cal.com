import { isSMSOrWhatsappAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { Icon } from "@calcom/ui/components/icon";
import classNames from "@calcom/ui/classNames";

import type { WorkflowStep } from "../lib/types";

export function getActionIcon(steps: WorkflowStep[], className?: string): JSX.Element {
  if (steps.length === 0) {
    return (
      <Icon
        name="zap"
        className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
        aria-hidden="true"
      />
    );
  }

  if (steps.length === 1) {
    if (isSMSOrWhatsappAction(steps[0].action)) {
      return (
        <Icon
          name="smartphone"
          className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
          aria-hidden="true"
        />
      );
    } else {
      return (
        <Icon
          name="mail"
          className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
          aria-hidden="true"
        />
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
          <Icon
            name="smartphone"
            className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
            aria-hidden="true"
          />
        );
      case "EMAIL":
        return (
          <Icon
            name="mail"
            className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
            aria-hidden="true"
          />
        );
      case "MIX":
        return (
          <Icon
            name="bell"
            className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
            aria-hidden="true"
          />
        );
      default:
        <Icon
          name="zap"
          className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
          aria-hidden="true"
        />;
    }
  }

  return <></>;
}
