import { CRUD } from "@calcom/features/audit-logs/types";
import {
  AuditLogTriggerTargets,
  AuditLogSystemTriggerEvents,
  AuditLogAppTriggerEvents,
  AuditLogCredentialTriggerEvents,
  AuditLogApiKeysTriggerEvents,
} from "@calcom/prisma/enums";

export const triggerToMetadata: Record<string, any> = {
  // updateAppCredentials: {
  //   action: AuditLogSystemTriggerEvents.SYSTEM_SETTINGS_UPDATED,
  //   description: "App keys have been updated",
  //   crud: CRUD.UPDATE,
  //   target: AuditLogTriggerTargets.SYSTEM,
  // },
  apiKeyUsed: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_USED,
    description: "An apiKey was used.",
    crud: CRUD.READ,
    target: AuditLogTriggerTargets.API_KEYS,
  },
  create: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_CREATED,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.API_KEYS,
  },
  delete: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_DELETED,
    description: "An apiKey was deleted.",
    crud: CRUD.DELETE,
    target: AuditLogTriggerTargets.API_KEYS,
  },
  edit: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_UPDATED,
    description: "An apiKey was updated.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.API_KEYS,
  },
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
