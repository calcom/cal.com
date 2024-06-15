import { getAuditLogManager } from "@calcom/features/audit-logs/lib/getAuditLogManager";

import { log } from ".";

export async function reportEvent(credential: any, innerEvent: any) {
  const auditLogManager = await getAuditLogManager({ credential });
  if (!auditLogManager) {
    return;
  }

  return await auditLogManager.reportEvent(innerEvent);
}
