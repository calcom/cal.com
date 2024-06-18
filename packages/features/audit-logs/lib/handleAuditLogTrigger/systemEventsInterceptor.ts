import type { Credential } from "@calcom/prisma/client";
import {
  AuditLogTriggerTargets,
  AuditLogAppTriggerEvents,
  AuditLogSystemTriggerEvents,
  AuditLogCredentialTriggerEvents,
} from "@calcom/prisma/enums";

import { log } from ".";
import type { AuditLogEvent } from "../../types";

export function interceptSystemEvents(innerEvent: AuditLogEvent, credential: Credential) {
  log.silly("System interceptor started.");
  if (
    (innerEvent.action === AuditLogAppTriggerEvents.APP_KEYS_UPDATED ||
      innerEvent.action === AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED) &&
    innerEvent.target.id === credential.id.toString()
  ) {
    log.silly("Action intercepted by system interceptor. SYSTEM_SETTINGS_UPDATED");
    innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_SETTINGS_UPDATED;
    innerEvent.target.type = AuditLogTriggerTargets.SYSTEM;
    if (
      innerEvent.fields &&
      (innerEvent.fields["oldCredential.key.disabledEvents"] as []).length !==
        (innerEvent.fields["updatedCredential.key.disabledEvents"] as []).length
    ) {
      log.silly("Disabled events updated.");
      if (
        (innerEvent.fields["oldCredential.key.disabledEvents"] as []).length >
        (innerEvent.fields["updatedCredential.key.disabledEvents"] as []).length
      ) {
        log.silly("SYSTEM_EVENT_ON");
        innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_EVENT_ON;
      } else {
        log.silly("SYSTEM_EVENT_OFF");
        innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_EVENT_OFF;
      }
    }
  }
  log.silly("System interceptor complete.");

  return innerEvent;
}
