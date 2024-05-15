import GenericAuditLogManager from "@calcom/app-store/templates/audit-log-implementation/lib/AuditLogManager";
import type { AuditLogsManager } from "@calcom/features/audit-logs/types";

export async function getAuditLogManager(): Promise<AuditLogsManager> {
  // Based on configuration, return the proper audit log manager, initiated
  // This means that if there are multiple installations, we'd first define which installation to use
  // get the necessary keys from that installation and then initiate its client

  // At the moment Generic Audit Log Manager is the default audit logs manager.
  const auditLogsManager = new GenericAuditLogManager({ apiKey: "", projectId: "" });
  return auditLogsManager;
}
