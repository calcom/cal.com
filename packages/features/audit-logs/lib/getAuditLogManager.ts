import GenericAuditLogManager from "@calcom/app-store/templates/audit-log-implementation/lib/AuditLogManager";
import type { AuditLogsManager } from "@calcom/features/audit-logs/types";

import type { Credential } from ".prisma/client";

export function getAuditLogManager(credential: Credential): AuditLogsManager {
  const credentialKey = credential.key as any;
  const auditLogsManager = new GenericAuditLogManager({ ...credentialKey });
  return auditLogsManager;
}
