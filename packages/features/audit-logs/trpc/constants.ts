import { CRUD } from "@calcom/features/audit-logs/types";
import {
  AuditLogTriggerTargets,
  AuditLogSystemTriggerEvents,
  AuditLogAppTriggerEvents,
  AuditLogCredentialTriggerEvents,
} from "@calcom/prisma/enums";

export const triggerToMetadata: Record<string, any> = {
  // updateAppCredentials: {
  //   action: AuditLogSystemTriggerEvents.SYSTEM_SETTINGS_UPDATED,
  //   description: "App keys have been updated",
  //   crud: CRUD.UPDATE,
  //   target: AuditLogTriggerTargets.SYSTEM,
  // },
  toggleApp: {
    action: AuditLogAppTriggerEvents.APP_TOGGLE,
    description: "App has been enabled/disabled by admin.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.APPS,
  },
  saveKeys: {
    action: AuditLogAppTriggerEvents.APP_KEYS_UPDATED,
    description: "App keys have been updated by admin.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.APPS,
  },
  updateAppCredentials: {
    action: AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED,
    description: "App keys have been updated",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.CREDENTIAL,
  },
  systemMisc: {
    action: AuditLogSystemTriggerEvents.SYSTEM_MISC,
    description: "AuditLog implementation specific action was performed.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.SYSTEM,
  },
};
