import { safeStringify } from "@calcom/lib/safeStringify";
import {
  AuditLogTriggerTargets,
  AuditLogAppTriggerEvents,
  AuditLogSystemTriggerEvents,
  AuditLogCredentialTriggerEvents,
} from "@calcom/prisma/enums";

import { log } from ".";

export function interceptSystemEvents(innerEvent: any, credential: any) {
  if (
    (innerEvent.action === AuditLogAppTriggerEvents.APP_KEYS_UPDATED ||
      innerEvent.action === AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED) &&
    innerEvent.target.id === credential.id
  ) {
    log.silly("Action intercepted by system interceptor. SYSTEM_SETTINGS_UPDATED");
    innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_SETTINGS_UPDATED;
    innerEvent.target.type = AuditLogTriggerTargets.SYSTEM;
    if (
      innerEvent.fields["oldCredential.key.disabledEvents"].length !==
      innerEvent.fields["updatedCredential.key.disabledEvents"].length
    ) {
      log.silly("Disabled events updated.");
      if (
        innerEvent.fields["oldCredential.key.disabledEvents"].length >
        innerEvent.fields["updatedCredential.key.disabledEvents"].length
      ) {
        log.silly("SYSTEM_EVENT_ON");
        innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_EVENT_ON;
      } else {
        log.silly("SYSTEM_EVENT_OFF");
        innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_EVENT_OFF;
      }
    }
  }

  return innerEvent;
}
