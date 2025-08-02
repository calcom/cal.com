import { AuditLogService } from "~/lib/audit-log.service";
import type { AuditLogEvent } from "~/lib/types";

export async function EmitAuditLogEvent(event: AuditLogEvent) {
  await AuditLogService.logEvent(event);
}
