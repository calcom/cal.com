import { BellIcon, MailIcon, SmartphoneIcon, ZapIcon } from "lucide-react";

import { isSMSOrWhatsappAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import classNames from "@calcom/ui/classNames";

import type { WorkflowStep } from "../lib/types";

export function getActionIcon(steps: WorkflowStep[], className?: string): JSX.Element {
  if (steps.length === 0) {
    return (
      <ZapIcon
        className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
        aria-hidden="true"
      />
    );
  }

  if (steps.length === 1) {
    if (isSMSOrWhatsappAction(steps[0].action)) {
      return (
        <SmartphoneIcon
          className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
          aria-hidden="true"
        />
      );
    } else {
      return (
        <MailIcon
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
          <SmartphoneIcon
            className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
            aria-hidden="true"
          />
        );
      case "EMAIL":
        return (
          <MailIcon
            className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
            aria-hidden="true"
          />
        );
      case "MIX":
        return (
          <BellIcon
            className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
            aria-hidden="true"
          />
        );
      default:
        <ZapIcon
          className={classNames(className ? className : "mr-1.5 inline h-3 w-3")}
          aria-hidden="true"
        />;
    }
  }

  return <></>;
}
