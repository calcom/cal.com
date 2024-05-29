import type { AuditLogsManager } from "@calcom/features/audit-logs/types";
import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Credential } from "@calcom/prisma/client";

const auditLogImplementations = {
  // Manually add your Audit Log Implementation
  // [slug: string]: function that imports entire app
  // example: () => import("./example"),
  genericImplementation: () => import("@calcom/app-store/templates/audit-log-implementation"),
};

const log = logger.getSubLogger({ prefix: ["[lib] auditLogManagerClient"] });

export async function getAuditLogManager(credential: Credential): Promise<AuditLogsManager | void> {
  log.silly(
    "Getting audit log manager for",
    safeStringify({ appName: credential.appId, cred: getPiiFreeCredential(credential) })
  );

  if (!credential.type.includes("auditLogs")) {
    log.error(`Attempted to get auditLogManager for an incompatible app type: ${credential.appId}`);
    return;
  }

  const appImportFn = auditLogImplementations[credential.appId as keyof typeof auditLogImplementations];
  let auditLogsManager = appImportFn ? await appImportFn() : null;

  if (!auditLogsManager) {
    log.error(`Couldn't get manager for ${credential.appId}. Assigning generic manager.`);
    auditLogsManager = await auditLogImplementations.genericImplementation();
  }

  if (!("zod" in auditLogsManager) || !("appKeysSchema" in auditLogsManager.zod)) {
    log.error(`Zod schemas not properly defined for ${credential.appId}`);
    return;
  }
  if (!("lib" in auditLogsManager) || !("AuditLogManager" in auditLogsManager.lib)) {
    log.error(`AuditLogManager not properly defined for ${credential.appId}`);
    return;
  }

  const credentialKey = auditLogsManager.zod.appKeysSchema.parse(credential.key);
  const auditLogManager = auditLogsManager.lib.AuditLogManager;
  return new auditLogManager(credentialKey);
}
