import { getAuditLogManager } from "@calcom/features/audit-logs/lib/getAuditLogManager";
import type { Credential } from "@calcom/prisma/client";

import type { AuditLogEvent } from "../../types";

export async function reportEvent(credential: Credential, innerEvent: AuditLogEvent) {
  const auditLogManager = await getAuditLogManager({ credential });
  if (!auditLogManager) {
    return;
  }

  return await auditLogManager.reportEvent(innerEvent);
}
