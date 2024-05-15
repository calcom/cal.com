import type { AuditLogEvent } from "audit-logs/types";

import logger from "@calcom/lib/logger";

import { getAuditLogManager } from "./getAuditLogManager";

export async function handleAuditLogTrigger(event: AuditLogEvent) {
  try {
    const auditLogManager = await getAuditLogManager();
    auditLogManager.report(event);
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
