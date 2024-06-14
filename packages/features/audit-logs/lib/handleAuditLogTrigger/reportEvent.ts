import { getAuditLogManager } from "../getAuditLogManager";

export async function reportEvent(credential: any, innerEvent: any) {
  const auditLogManager = await getAuditLogManager({ credential });
  if (!auditLogManager) {
    return;
  }

  return await auditLogManager.reportEvent(innerEvent);
}
