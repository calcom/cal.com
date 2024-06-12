import { CRUD } from "@calcom/features/audit-logs/types";
import {
  AuditLogTriggerTargets,
  AuditLogSystemTriggerEvents,
  AuditLogAppTriggerEvents,
} from "@calcom/prisma/enums";

export const pathToAuditLogEvent: Record<string, any> = {
  // updateAppCredentials: {
  //   action: AuditLogSystemTriggerEvents.SYSTEM_CREDENTIALS_UPDATED,
  //   description: "App keys have been updated",
  //   crud: CRUD.UPDATE,
  //   target: AuditLogTriggerTargets.SYSTEM,
  // },
  updateAppCredentials: {
    action: AuditLogAppTriggerEvents.APP_KEYS_UPDATED,
    description: "App keys have been updated",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.APPS,
  },
  systemMisc: {
    action: AuditLogSystemTriggerEvents.SYSTEM_MISC,
    description: "AuditLog implementation specific action was performed.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.SYSTEM,
  },
};
