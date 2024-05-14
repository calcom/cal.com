import type { AuditLogsManager } from "@calcom/features/audit-logs/AuditLogsManager";
import { AuditLogManagerDummy } from "@calcom/features/audit-logs/AuditLogsManager";

export async function getAuditLogManager(): Promise<AuditLogsManager> {
  // based on app keys, return the proper audit logs manager
  // const appKeys: { apiKey: string; projectId: string } = (await getAppKeysFromSlug("boxyhq-retraced")) as any;

  // at the moment boxyhq is the default audit logs manager
  const boxy = new AuditLogManagerDummy({ apiKey: "", projectId: "" });
  return boxy;
}
