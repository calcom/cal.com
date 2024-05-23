import GenericAuditLogManager from "@calcom/app-store/templates/audit-log-implementation/lib/AuditLogManager";
import type { AuditLogsManager } from "@calcom/features/audit-logs/types";

import type { Credential } from ".prisma/client";

export function getAuditLogManager(credential: Credential): AuditLogsManager {
  const credentialKey = credential.key as { apiKey: string; endpoint: string; projectId: string };
  const auditLogsManager = new GenericAuditLogManager({ ...credentialKey });
  return auditLogsManager;
}
