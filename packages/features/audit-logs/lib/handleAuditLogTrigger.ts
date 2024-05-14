import logger from "@calcom/lib/logger";

import { getAuditLogManager } from "./AuditLogsManager";

export async function handleAuditLogTrigger() {
  try {
    const auditLogManager = await getAuditLogManager();

    auditLogManager.report();
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
