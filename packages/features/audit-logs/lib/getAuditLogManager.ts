import type { AuditLogsManager } from "@calcom/features/audit-logs/types";
import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Credential } from "@calcom/prisma/client";

export const auditLogImplementationsVault = {
  // Manually add your Audit Log Implementation
  // [slug: string]: function that imports entire app
  // example: () => import("./example"),
  genericImplementation: () => import("@calcom/app-store/templates/audit-log-implementation"),
  // test: () => import("@calcom/app-store/test"),
};

const log = logger.getSubLogger({ prefix: ["[lib] auditLogManagerClient"] });

export async function getAuditLogManager({
  credential,
  auditLogImplementations = auditLogImplementationsVault,
}: {
  credential: Credential;
  auditLogImplementations?: typeof auditLogImplementationsVault;
}): Promise<AuditLogsManager | void> {
  log.silly(
    "Getting audit log manager for",
    safeStringify({ appName: credential.appId, cred: getPiiFreeCredential(credential) })
  );

  if (!(credential.type === "auditLogs")) {
    log.error(`Attempted to get auditLogManager for an incompatible app type: ${credential.type}.`);
    return;
  }

  let appImportFn = auditLogImplementations[credential.appId as keyof typeof auditLogImplementations];

  if (!appImportFn) {
    log.error(`Couldn't get manager for ${credential.appId}. Assigning generic manager.`);
    appImportFn = auditLogImplementations["genericImplementation"];
  }

  const auditLogsManager = await appImportFn();

  if (!("zod" in auditLogsManager) || !("appKeysSchema" in auditLogsManager.zod)) {
    log.error(`Zod schemas not properly defined for ${credential.appId}`);
    return;
  }

  if (!("lib" in auditLogsManager) || !("AuditLogManager" in auditLogsManager.lib)) {
    log.error(`AuditLogManager not properly defined for ${credential.appId}`);
    return;
  }

  const appKeys = auditLogsManager.zod.appKeysSchema.safeParse(credential.key);
  if (!appKeys.success) {
    log.error(`AppKeys on credential ${credential.id} do not match the expected schema.`);
    return;
  }

  const auditLogManager = auditLogsManager.lib.AuditLogManager;
  log.silly("getAuditLogManager complete.");
  return new auditLogManager(appKeys.data, credential.id);
}
