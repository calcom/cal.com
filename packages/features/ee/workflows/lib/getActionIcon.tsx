import type { WorkflowStep } from "@prisma/client";
import { WorkflowActions } from "@prisma/client";

import { classNames } from "@calcom/lib";
import { Zap, Smartphone, Mail, Bell } from "@calcom/ui/components/icon";

export function isSMSAction(action: WorkflowActions): boolean {
  const isForSMS= action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.SMS_NUMBER
  const isForWhatsapp = action === WorkflowActions.WHATSAPP_ATTENDEE || action === WorkflowActions.WHATSAPP_NUMBER
  return isForSMS || isForWhatsapp
}

export function getActionIcon(steps: WorkflowStep[], className?: string): JSX.Element {
  if (steps.length === 0) {
    return <Zap className={classNames(className ? className : "mr-1.5 inline h-3 w-3")} aria-hidden="true" />;
  }

  if (steps.length === 1) {
    if (isSMSAction(steps[0].action)) {
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
        messageType = isSMSAction(step.action) ? "SMS" : "EMAIL";
      } else if (messageType !== "MIX") {
        const newMessageType = isSMSAction(step.action) ? "SMS" : "EMAIL";
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
